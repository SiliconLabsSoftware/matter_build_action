const { run } = require('../src/main.js');
const core = require('@actions/core');
const fs = require('fs');
const { JsonParser } = require('../src/jsonParser');

jest.mock('@actions/core');
jest.mock('fs');
jest.mock('../src/jsonParser');
jest.mock('child_process');

describe('Skip Logic Tests', () => 
{
    beforeEach(() => 
    {
        jest.clearAllMocks();

        // Setup default mocks
        core.setOutput = jest.fn();
        core.setFailed = jest.fn();
        core.info = jest.fn();
        core.startGroup = jest.fn();
        core.endGroup = jest.fn();
        core.getInput = jest.fn();
    });

    it('should set should-skip to true when commands array is empty', async () => 
    {
        // Setup inputs
        core.getInput.mockImplementation((name) => 
        {
            const inputs = {
                'build-type': 'standard',
                'example-app': 'lighting-app',
                'path-to-example-app': '/path/to/example',
                'json-file-path': '/path/to/config.json',
                'build-script': 'build.sh',
                'output-directory': '/output'
            };

            return inputs[name] || '';
        });

        // Mock file reading
        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify({ standard: { default: [] } }));
        });

        // Mock JsonParser to return empty commands array
        JsonParser.mockImplementation(() => ({
            generateCommands: jest.fn(() => []) // Return empty array
        }));

        await run();

        expect(core.setOutput).toHaveBeenCalledWith('should-skip', 'true');
        expect(core.info).toHaveBeenCalledWith('No build commands generated. Setting should-skip to true.');
    });

    it('should set should-skip to false when commands array has items', async () => 
    {
        // Setup inputs
        core.getInput.mockImplementation((name) => 
        {
            const inputs = {
                'build-type': 'standard',
                'example-app': 'lighting-app',
                'path-to-example-app': '/path/to/example',
                'json-file-path': '/path/to/config.json',
                'build-script': 'build.sh',
                'output-directory': '/output'
            };

            return inputs[name] || '';
        });

        // Mock file reading
        fs.readFile = jest.fn((path, encoding, callback) => 
        {
            callback(null, JSON.stringify({
                standard: {
                    default: [{
                        boards: ['board1'], arguments: ['arg1']
                    }]
                }
            }));
        });

        // Mock JsonParser to return commands
        JsonParser.mockImplementation(() => ({
            generateCommands: jest.fn(() => ['build.sh /path/to/example /output board1 arg1'])
        }));

        await run();

        expect(core.setOutput).toHaveBeenCalledWith('should-skip', 'false');
        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Commands to execute'));
    });
});
