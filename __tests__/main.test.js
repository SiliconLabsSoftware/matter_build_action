const core = require('@actions/core');
const fs = require('fs');
const { execSync } = require('child_process');
const { run } = require('../src/main.js');
const { JsonParser } = require('../src/jsonParser'); // Mock JsonParser

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
jest.mock('../src/jsonParser'); // Mock JsonParser

describe('run', () => 
{
    beforeEach(() => 
    {
        jest.clearAllMocks();
    });

    it('should run the GitHub Action successfully', async () => 
    {
        const mockCommands = ['build_script.sh examples/exampleApp/silabs out/test board1 arg1 arg2'];

        const mockJsonData = {
            "standard": {
                "default": [
                    {
                        "boards": ["board1"],
                        "arguments": ["arg1", "arg2"]
                    }
                ],
                "lighting-app": [
                    {
                        "boards": ["board1"],
                        "arguments": ["arg1", "arg2"]
                    }
                ],            
            }
        };

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'standard'; // Mock build-type input
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify(mockJsonData));
        });

        JsonParser.mockImplementation(() => ({
            generateCommands: jest.fn(() => mockCommands),
        }));

        execSync.mockImplementation((command, options) => 
        {
            console.log('execSync called with:', command, options);
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.getInput).toHaveBeenCalledWith('json-file-path', { required: true });
        expect(core.getInput).toHaveBeenCalledWith('example-app', { required: true });
        expect(core.getInput).toHaveBeenCalledWith('build-script', { required: true });
        expect(core.getInput).toHaveBeenCalledWith('output-directory', { required: true });
        expect(core.getInput).toHaveBeenCalledWith('path-to-example-app', { required: true });
        expect(core.getInput).toHaveBeenCalledWith('build-type', { required: true }); // Validate build-type input
        expect(execSync).toHaveBeenCalledWith(mockCommands[0], { stdio: 'inherit' });
    });

    it('should handle invalid build type', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'invalid-type'; // Invalid build-type
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid build type: invalid-type. Supported build types are: standard, full, custom-sqa, release'));
    });

    it('should handle error when JsonParser throws an error', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'standard';
        });

        JsonParser.mockImplementation(() => 
        {
            throw new Error('JsonParser error');
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error: JsonParser error'));
    });

    it('should handle error during command execution', async () => 
    {
        const mockCommands = ['build_script.sh examples/exampleApp/silabs out/test board1 arg1 arg2'];

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'standard';
        });

        JsonParser.mockImplementation(() => ({
            generateCommands: jest.fn(() => mockCommands),
        }));

        execSync.mockImplementation(() => 
        {
            throw new Error('Command execution error');
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Build script failed with error: Command execution error'));
    });

    it('should continue executing remaining commands and emit warnings when continue-on-error is true', async () => 
    {
        const mockCommands = [
            'build_script.sh examples/exampleApp/silabs out/test board1 arg1',
            'build_script.sh examples/exampleApp/silabs out/test board2 arg2',
            'build_script.sh examples/exampleApp/silabs out/test board3 arg3',
        ];

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'standard';
            if (name === 'continue-on-error') return 'true';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify({ standard: { default: [] } }));
        });

        JsonParser.mockImplementation(() => ({
            generateCommands: jest.fn(() => mockCommands),
        }));

        execSync.mockImplementation((command) => 
        {
            if (command === mockCommands[1]) 
            {
                throw new Error('board2 build failed');
            }
        });

        await expect(run()).resolves.not.toThrow();

        // Every command must still be attempted.
        expect(execSync).toHaveBeenCalledTimes(mockCommands.length);
        mockCommands.forEach((command) => 
        {
            expect(execSync).toHaveBeenCalledWith(command, { stdio: 'inherit' });
        });

        // The failed command should be surfaced as a warning, both inline and in the final summary.
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining(mockCommands[1]));
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('board2 build failed'));
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('1 build command(s) failed'));

        // The action must not be marked as failed when continue-on-error is enabled.
        expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should still fail fast on the first command failure when continue-on-error is false', async () => 
    {
        const mockCommands = [
            'build_script.sh examples/exampleApp/silabs out/test board1 arg1',
            'build_script.sh examples/exampleApp/silabs out/test board2 arg2',
        ];

        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'standard';
            if (name === 'continue-on-error') return 'false';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify({ standard: { default: [] } }));
        });

        JsonParser.mockImplementation(() => ({
            generateCommands: jest.fn(() => mockCommands),
        }));

        execSync.mockImplementation(() => 
        {
            throw new Error('board1 build failed');
        });

        await expect(run()).resolves.not.toThrow();

        // The loop must bail out after the first failing command.
        expect(execSync).toHaveBeenCalledTimes(1);
        expect(execSync).toHaveBeenCalledWith(mockCommands[0], { stdio: 'inherit' });
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Build script failed with error: board1 build failed'));
    });

    it('should handle error when readFileAsync throws an error', async () => 
    {
        core.getInput = jest.fn((name) => 
        {
            if (name === 'json-file-path') return './test.json';
            if (name === 'example-app') return 'exampleApp';
            if (name === 'path-to-example-app') return 'examples/exampleApp/silabs';
            if (name === 'build-script') return 'build_script.sh';
            if (name === 'output-directory') return 'out/test';
            if (name === 'build-type') return 'standard';
        });

        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(new Error('readFileAsync error'), null);
        });

        await expect(run()).resolves.not.toThrow();
        
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error: Error: readFileAsync error'));
    });
});