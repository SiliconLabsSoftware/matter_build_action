const core = require('@actions/core');
const fs = require('fs');
const { execSync } = require('child_process');

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
 * Main function to run the GitHub Action.
 */
async function run() 
{
    let exampleApp;
    let jsonData;
    let buildScript;
    let outputDirectory;
    let stepCounter = 1;

    // Process the github arguments and stores them
    core.startGroup(`Step ${stepCounter++}: Read and parse github action inputs.`);
    try 
    {
        exampleApp = core.getInput('example-app');
        buildScript = core.getInput('build-script');
        outputDirectory = core.getInput('output-directory');

        const filePath = core.getInput('json-file-path');
        const data = await readFileAsync(filePath, 'utf8');
        jsonData = JSON.parse(data);
    }
    catch (error) 
    {
        core.setFailed(`Action failed with error: ${error}`);
        console.error('Error reading or parsing JSON file:', error);
    }
    core.endGroup();

    // Builds the commands that need to be execute based on the provide inputs
    core.startGroup(`Step ${stepCounter++}: Parse JSON file to pull build information for the example-app.`);
    let commands = [];
    try     
    {   
        const defaultBuildInfo = jsonData["default"]
        if (defaultBuildInfo) 
        {
            defaultBuildInfo.forEach(info => 
            {
                const {
                    boards, arguments: args 
                } = info;
                boards.forEach(board => 
                {
                    const command = `${buildScript} examples/${exampleApp}/silabs ${outputDirectory} ${board} ${args.join(' ')}`;
                    commands.push(command);
                });
            });
        }
        else
        {
            console.log('No default build information found.');
            core.info('No default build information found.');
        }

        const buildInfo = jsonData[exampleApp];
        if (!buildInfo && !defaultBuildInfo) 
        {
            core.setFailed(`Action failed with error: No build information found for ${exampleApp}`);
        }

        buildInfo.forEach(info => 
        {
            const {
                boards, arguments: args 
            } = info;
            boards.forEach(board => 
            {
                const command = `${buildScript} examples/${exampleApp}/silabs ${outputDirectory} ${board} ${args.join(' ')}`;
                commands.push(command);
            });
        });

        core.info(`Commands to execute: ${JSON.stringify(commands)}`);
    }
    catch (error) 
    {
        core.setFailed(`Action failed with error: ${error}`);
        console.error('Error parsing build information:', error);
    }
    core.endGroup();

    // Runs each generated command in their own step
    for (const command of commands) 
    {   
        core.startGroup(`Step ${stepCounter++}: Executing ${command}`);
        try 
        {
            execSync(command, {
                stdio: 'inherit' 
            });
        }
        catch (error) 
        {
            core.setFailed(`Build script failed with error: ${error.message}`);
            console.error('Error executing command:', command, error);
            core.endGroup();
                
            return;
        }
        core.endGroup();
    }
    
}

module.exports = { run };
