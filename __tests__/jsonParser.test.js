const { JsonParser } = require('../src/jsonParser');

describe('JsonParser', () => 
{
    const mockJsonData = {
        standard: {
            default: [
                {
                    boards: ['board1', 'board2'],
                    arguments: ['arg1', 'arg2']
                }
            ],
            exampleApp1: [
                {
                    boards: ['board3'],
                    arguments: ['arg3']
                }
            ]
        }
    };

    const buildScript = 'build.sh';
    const outputDirectory = '/output';
    const slcpPath = '/path/to/example.slcp';
    const slcwPath = '/path/to/example.slcw';

    it('should generate commands for default build type', () => 
    {
        const parser = new JsonParser(mockJsonData, 'standard', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();
        expect(commands).toEqual([
            'build.sh /path/to/example.slcw /output board1 arg1 arg2',
            'build.sh /path/to/example.slcw /output board2 arg1 arg2',
            'build.sh /path/to/example.slcw /output board3 arg3'
        ]);
    });

    it('should throw an error if build type is missing', () => 
    {
        const parser = new JsonParser(mockJsonData, 'nonexistent', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        expect(() => parser.generateCommands()).toThrow('No build type found for nonexistent');
    });

    it('should throw an error if example app data is missing and no default build info exists', () => 
    {
        const mockJsonDataNoDefault = {
            standard: {
                exampleApp1: [
                    {
                        boards: ['board3'],
                        arguments: ['arg3']
                    }
                ]
            }
        };

        const parser = new JsonParser(mockJsonDataNoDefault, 'standard', 'nonexistentApp', buildScript, outputDirectory, slcpPath, slcwPath);
        expect(() => parser.generateCommands()).toThrow('No build information found for nonexistentApp');
    });

    it('should generate commands only for default build info if example app data is missing', () => 
    {
        const modifiedJsonData = {
            standard: {
                default: [
                    {
                        boards: ['board1'],
                        arguments: ['arg1']
                    }
                ]
            }
        };
        const parser = new JsonParser(modifiedJsonData, 'standard', 'nonexistentApp', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();
        expect(commands).toEqual(['build.sh /path/to/example.slcw /output board1 arg1']);
    });

    it('should throw an error if neither default nor specific build info exists', () => 
    {
        const emptyJsonData = {
            standard: {}
        };
        const parser = new JsonParser(emptyJsonData, 'standard', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        expect(() => parser.generateCommands()).toThrow('No build information found for exampleApp1');
    });

    it('should generate correct commands when multiple build types exist', () => 
    {
        const multiBuildTypeJsonData = {
            standard: {
                default: [
                    {
                        boards: ['board1'],
                        arguments: ['arg1']
                    }
                ],
                exampleApp1: [
                    {
                        boards: ['board2'],
                        arguments: ['arg2']
                    }
                ]
            },
            full: {
                default: [
                    {
                        boards: ['board3'],
                        arguments: ['arg3']
                    }
                ],
                exampleApp2: [
                    {
                        boards: ['board4'],
                        arguments: ['arg4']
                    }
                ]
            }
        };

        const parser = new JsonParser(multiBuildTypeJsonData, 'standard', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();
        expect(commands).toEqual([
            'build.sh /path/to/example.slcw /output board1 arg1',
            'build.sh /path/to/example.slcw /output board2 arg2'
        ]);
    });

    it('should resolve template with projectFileType', () => 
    {
        const mockJsonDataWithTemplate = {
            standard: {
                exampleApp1: [
                    {
                        boards: ['board1'],
                        arguments: ['arg1'],
                        "projectFileType": "slcp"
                    }
                ]
            }
        };

        const parser = new JsonParser(mockJsonDataWithTemplate, 'standard', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();  
        expect(commands).toEqual([
            'build.sh /path/to/example.slcp /output board1 arg1'
        ]);
    });

    it('should handle mixed projectFileType configurations in default and specific builds', () => 
    {
        const mockJsonDataMixed = {
            standard: {
                default: [
                    {
                        boards: ['board1'],
                        arguments: ['arg1'],
                        "projectFileType": "slcp"
                    }
                ],
                exampleApp1: [
                    {
                        boards: ['board2'],
                        arguments: ['arg2']
                        // No projectFileType specified (should use default .slcw)
                    },
                    {
                        boards: ['board3'],
                        arguments: ['arg3'],
                        "projectFileType": "slcp"
                    }
                ]
            }
        };

        const parser = new JsonParser(mockJsonDataMixed, 'standard', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();
        expect(commands).toEqual([
            'build.sh /path/to/example.slcp /output board1 arg1',
            'build.sh /path/to/example.slcw /output board2 arg2',
            'build.sh /path/to/example.slcp /output board3 arg3'
        ]);
    });

    it('should handle template with mixed projectFileTypes', () => 
    {
        const mockJsonDataMixed = {
            standard: {
                exampleApp1: [
                    {
                        boards: ['board1'],
                        arguments: ['arg1'],
                        "projectFileType": "slcp"
                    },
                    {
                        boards: ['board2'], 
                        arguments: ['arg2'],
                        "projectFileType": "slcw"
                    },
                    {
                        boards: ['board3'],
                        arguments: ['arg3']
                        // No projectFileType specified (should default to slcw)
                    }
                ]
            }
        };

        const parser = new JsonParser(mockJsonDataMixed, 'standard', 'exampleApp1', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();
        expect(commands).toEqual([
            'build.sh /path/to/example.slcp /output board1 arg1',
            'build.sh /path/to/example.slcw /output board2 arg2',
            'build.sh /path/to/example.slcw /output board3 arg3'
        ]);
    });

    it('should handle separate slcp/slcw paths for thread platforms', () => {
        const jsonData = {
            "standard": {
                "default": [
                    {
                        "boards": ["brd4187c"],
                        "arguments": [""]
                    },
                    {
                        "boards": ["brd4187c"],
                        "arguments": [""],
                        "projectFileType": "slcp"
                    }
                ]
            }
        };

        const slcpPath = 'slc/apps/air-quality-sensor-app/thread/air-quality-sensor-app.slcp';
        const slcwPath = 'slc/apps/air-quality-sensor-app/thread/air-quality-sensor-app-series-2-internal.slcw';
        
        const parser = new JsonParser(jsonData, 'standard', 'air-quality-sensor-app', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();

        expect(commands).toHaveLength(2);
        // First config has no projectFileType, defaults to .slcw, uses slcwPath
        expect(commands[0]).toBe('build.sh slc/apps/air-quality-sensor-app/thread/air-quality-sensor-app-series-2-internal.slcw /output brd4187c ');
        // Second config specifies .slcp, uses slcpPath
        expect(commands[1]).toBe('build.sh slc/apps/air-quality-sensor-app/thread/air-quality-sensor-app.slcp /output brd4187c ');
    });

    it('should handle separate slcp/slcw paths for WiFi platforms', () => {
        const jsonData = {
            "standard": {
                "default": [
                    {
                        "boards": ["brd4187c"],
                        "arguments": [""],
                        "projectFileType": "slcp"
                    },
                    {
                        "boards": ["brd4187c"],
                        "arguments": [""]
                    }
                ]
            }
        };

        const slcpPath = 'slc/apps/thermostat/wifi/thermostat-917-ncp.slcp';
        const slcwPath = 'slc/apps/thermostat/wifi/thermostat-917-ncp.slcw';
        
        const parser = new JsonParser(jsonData, 'standard', 'thermostat', buildScript, outputDirectory, slcpPath, slcwPath);
        const commands = parser.generateCommands();

        expect(commands).toHaveLength(2);
        // For WiFi, both configs keep the same filename with different extensions
        expect(commands[0]).toBe('build.sh slc/apps/thermostat/wifi/thermostat-917-ncp.slcp /output brd4187c ');
        expect(commands[1]).toBe('build.sh slc/apps/thermostat/wifi/thermostat-917-ncp.slcw /output brd4187c ');
    });


});
