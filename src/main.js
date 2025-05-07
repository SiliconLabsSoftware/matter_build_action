const core = require('@actions/core');
const fs = require('fs');
const { exec } = require('child_process'); // Replace execSync with exec
const { JsonParser } = require('./jsonParser'); // Import the new JsonParser class

/**
 * Reads a file asynchronously.
 * @param {string} path - The path to the file.
 * @param {string} encoding - The encoding of the file.
 * @returns {Promise<string>} A promise that resolves with the file content.
 */
function readFileAsync(path, encoding) 
{
    return new Promise((resolve, reject) => 
    {
        fs.readFile(path, encoding, (err, data) =>  
        {
            if (err) 
            {
                reject(err);
            }
            else 
            {
                resolve(data);
            }
        });
    });
}

/**
 * Logs and sets a failure message.
 * @param {string} message - The failure message.
 */
function handleFailure(message) 
{
    core.setFailed(message);
    console.error(message);
}

/**
 * Executes a command in a separate runner with logging groups.
 * @param {string} command - The command to execute.
 * @param {number} stepCounter - The current step counter for logging.
 * @returns {Promise<void>} A promise that resolves when the command completes.
 */
async function executeCommandWithGroup(command, stepCounter) 
{
    core.startGroup(`Step ${stepCounter}: Executing command: ${command}`);
    
    return new Promise((resolve, reject) => 
    {
        const process = exec(command, { stdio: 'inherit' }, (error) => 
        {
            if (error) 
            {
                reject(new Error(`Command "${command}" failed with error: ${error.message}`));
            }
            else 
            {
                resolve();
            }
        });

        // Pipe output to the console
        process.stdout?.pipe(process.stdout);
        process.stderr?.pipe(process.stderr);
    }).finally(() => 
    {
        core.endGroup();
    });
}

/**
 * Main function to run the GitHub Action.
 * This function processes inputs, parses JSON data, generates build commands, and executes them.
 */
async function run() 
{
    let exampleApp;
    let pathToExampleApp;
    let jsonData;
    let buildScript;
    let outputDirectory;
    let stepCounter = 1;
    
    let buildType;
    const supportedBuildTypes = ["standard", "full", "custom-sqa", "release"]; // Supported build types

    // Step 1: Process GitHub Action inputs
    core.startGroup(`Step ${stepCounter++}: Read and parse github action inputs.`);
    try 
    {
        buildType = core.getInput('build-type', { required: true });
        
        // Validate build type
        if (!supportedBuildTypes.includes(buildType)) 
        {
            handleFailure(`Invalid build type: ${buildType}. Supported build types are: ${supportedBuildTypes.join(', ')}`);
            core.endGroup();

            return;
        }

        exampleApp = core.getInput('example-app', { required: true });
        pathToExampleApp = core.getInput('path-to-example-app', { required: true });
        buildScript = core.getInput('build-script', { required: true });
        outputDirectory = core.getInput('output-directory', { required: true });
        
        const filePath = core.getInput('json-file-path', { required: true });
        const data = await readFileAsync(filePath, 'utf8'); // Read JSON file
        jsonData = JSON.parse(data); // Parse JSON data
    }
    catch (error) 
    {
        handleFailure(`Action failed with error: ${error}`);
    }
    core.endGroup();

    // Step 2: Parse JSON and generate commands
    core.startGroup(`Step ${stepCounter++}: Parse JSON file to pull build information for the example-app.`);
    let commands = [];
    try 
    {
        // Use JsonParser class to parse JSON data and generate commands
        const parser = new JsonParser(jsonData, buildType, exampleApp, buildScript, pathToExampleApp, outputDirectory);
        commands = parser.generateCommands();

        core.info(`Commands to execute: ${JSON.stringify(commands)}`);
    }
    catch (error) 
    {
        handleFailure(`Action failed with error: ${error.message}`);
    }
    core.endGroup();

    // Step 3: Execute each command in individual runners with logging groups
    core.startGroup(`Step ${stepCounter++}: Execute commands in individual runners.`);
    try 
    {
        // Ensure commands are executed in parallel
        await Promise.all(
            commands.map(async (command, index) => 
            {
                try 
                {
                    await executeCommandWithGroup(command, stepCounter + index);
                }
                catch (error) 
                {
                    handleFailure(error.message);
                    throw error; // Stop further execution on failure
                }
            })
        );
    }
    catch (error) 
    {
        handleFailure(`Build script failed with error: ${error.message}`);
        core.endGroup();
        
        return;
    }
    core.endGroup();
}

module.exports = { run };
