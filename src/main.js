const core = require('@actions/core');
const fs = require('fs');
const { execSync } = require('child_process');
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
    let continueOnError = false;
    
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

        const continueOnErrorInput = core.getInput('continue-on-error', { required: false });
        continueOnError = String(continueOnErrorInput).toLowerCase() === 'true';

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

    // Step 3: Execute each command
    const failedCommands = [];
    for (const command of commands) 
    {   
        core.startGroup(`Step ${stepCounter++}: Executing ${command}`);
        try 
        {
            execSync(command, {
                stdio: 'inherit' // Inherit stdio to display command output
            });
        }
        catch (error) 
        {
            const message = `Build script failed with error: ${error.message}`;
            if (continueOnError) 
            {
                // Record the failure and keep executing remaining combinations.
                // The action is marked as failed after the loop completes.
                core.error(`${command} failed: ${error.message} (continue-on-error=true, continuing with remaining builds)`);
                failedCommands.push({
                    command,
                    message
                });
                core.endGroup();
                continue;
            }

            handleFailure(message);
            core.endGroup();

            return;
        }
        core.endGroup();
    }

    if (continueOnError && failedCommands.length > 0) 
    {
        const summary = failedCommands
            .map((failure, index) => `  ${index + 1}. ${failure.command} -> ${failure.message}`)
            .join('\n');
        handleFailure(`${failedCommands.length} build command(s) failed (continue-on-error=true):\n${summary}`);
    }
}

module.exports = { run };
