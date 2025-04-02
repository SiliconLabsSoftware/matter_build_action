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
    const pathToExampleApp = '/path/to/example';
    const outputDirectory = '/output';

    it('should generate commands for default build type', () => 
    {
        const parser = new JsonParser(mockJsonData, 'standard', 'exampleApp1', buildScript, pathToExampleApp, outputDirectory);
        const commands = parser.generateCommands();
        expect(commands).toEqual([
            'build.sh /path/to/example /output board1 arg1 arg2',
            'build.sh /path/to/example /output board2 arg1 arg2',
            'build.sh /path/to/example /output board3 arg3'
        ]);
    });

    it('should throw an error if build type is missing', () => 
    {
        const parser = new JsonParser(mockJsonData, 'nonexistent', 'exampleApp1', buildScript, pathToExampleApp, outputDirectory);
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

        const parser = new JsonParser(mockJsonDataNoDefault, 'standard', 'nonexistentApp', buildScript, pathToExampleApp, outputDirectory);
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
        const parser = new JsonParser(modifiedJsonData, 'standard', 'nonexistentApp', buildScript, pathToExampleApp, outputDirectory);
        const commands = parser.generateCommands();
        expect(commands).toEqual(['build.sh /path/to/example /output board1 arg1']);
    });

    it('should throw an error if neither default nor specific build info exists', () => 
    {
        const emptyJsonData = {
            standard: {}
        };
        const parser = new JsonParser(emptyJsonData, 'standard', 'exampleApp1', buildScript, pathToExampleApp, outputDirectory);
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

        const parser = new JsonParser(multiBuildTypeJsonData, 'standard', 'exampleApp1', buildScript, pathToExampleApp, outputDirectory);
        const commands = parser.generateCommands();
        expect(commands).toEqual([
            'build.sh /path/to/example /output board1 arg1',
            'build.sh /path/to/example /output board2 arg2'
        ]);
    });
});
