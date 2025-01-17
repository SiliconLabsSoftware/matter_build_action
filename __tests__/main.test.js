const core = require('@actions/core');
const fs = require('fs');
const { execSync } = require('child_process');
const { run } = require('../src/main.js');

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('fs');
jest.mock('fs', () => ({
    readFile: jest.fn(), // Mock readFile here
    promises: {
        access: jest.fn(),
    },
    constants: {
        O_RDONLY: 0, // Mock the O_RDONLY constant
    },
}));
jest.mock('child_process');

describe('run', () => 
{
    beforeEach(() => 
    {
        jest.clearAllMocks();
    });

    it('should run the GitHub Action successfully', async () => 
    {
        const mockJsonData = {
            "exampleApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        execSync.mockImplementation((command, options) => 
        {
            console.log('execSync called with:', command, options);
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.getInput).toHaveBeenCalledWith('json-file-path');
        expect(core.getInput).toHaveBeenCalledWith('example-app');
        expect(core.getInput).toHaveBeenCalledWith('build-script');
        expect(core.getInput).toHaveBeenCalledWith('output-directory');
        expect(execSync).toHaveBeenCalledWith('build_script.sh examples/exampleApp/silabs out/test board1 arg1 arg2', { stdio: 'inherit' });
    });

    it('should handle error when reading JSON file', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';

        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(new Error('File read error'), null);
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error:'));
    });

    it('should handle error when parsing JSON file', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, 'invalid json');
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error:'));
    });

    it('should handle error when no build information is found for the example app', async () => 
    {
        const mockJsonData = {
            "anotherApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error: No build information found for exampleApp'));
    });

    it('should handle error during command execution', async () => 
    {
        const mockJsonData = {
            "exampleApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        execSync.mockImplementation(() => 
        {
            throw new Error('Command execution error');
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Build script failed with error: Command execution error'));
    });

    it('should run default commands if present in JSON file', async () => 
    {
        const mockJsonData = {
            "default": [
                {
                    "boards": ["defaultBoard"],
                    "arguments": ["defaultArg1", "defaultArg2"]
                }
            ],
            "exampleApp": [
                {
                    "boards": ["board1"],
                    "arguments": ["arg1", "arg2"]
                }
            ],
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        execSync.mockImplementation((command, options) => 
        {
            console.log('execSync called with:', command, options);
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.getInput).toHaveBeenCalledWith('json-file-path');
        expect(core.getInput).toHaveBeenCalledWith('example-app');
        expect(core.getInput).toHaveBeenCalledWith('build-script');
        expect(core.getInput).toHaveBeenCalledWith('output-directory');
        expect(execSync).toHaveBeenCalledWith('build_script.sh examples/exampleApp/silabs out/test defaultBoard defaultArg1 defaultArg2', { stdio: 'inherit' });
        expect(execSync).toHaveBeenCalledWith('build_script.sh examples/exampleApp/silabs out/test board1 arg1 arg2', { stdio: 'inherit' });
    });

    it('should run only default commands if no specific build information is found for the example app', async () => 
    {
        const mockJsonData = {
            "default": [
                {
                    "boards": ["defaultBoard"],
                    "arguments": ["defaultArg1", "defaultArg2"]
                }
            ]
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        execSync.mockImplementation((command, options) => 
        {
            console.log('execSync called with:', command, options);
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.getInput).toHaveBeenCalledWith('json-file-path');
        expect(core.getInput).toHaveBeenCalledWith('example-app');
        expect(core.getInput).toHaveBeenCalledWith('build-script');
        expect(core.getInput).toHaveBeenCalledWith('output-directory');

        expect(execSync).toHaveBeenCalledWith('build_script.sh examples/exampleApp/silabs out/test defaultBoard defaultArg1 defaultArg2', { stdio: 'inherit' });
        
        expect(core.setFailed).not.toHaveBeenCalledWith(expect.stringContaining('Action failed with error:'));
        expect(execSync).not.toHaveBeenCalledWith(expect.stringContaining('board1'));
    });

    it('should handle error when no default or exampleApp build information is found', async () => 
    {
        const mockJsonData = {};

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.getInput).toHaveBeenCalledWith('json-file-path');
        expect(core.getInput).toHaveBeenCalledWith('example-app');
        expect(core.getInput).toHaveBeenCalledWith('build-script');
        expect(core.getInput).toHaveBeenCalledWith('output-directory');
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error: No build information found for exampleApp'));
    });
});