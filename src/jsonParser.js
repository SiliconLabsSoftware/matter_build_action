/**
 * JsonParser class is responsible for parsing JSON data and generating build commands
 * based on the provided build type and example app.
 */
class JsonParser 
{
    /**
     * Constructor for JsonParser.
     * @param {Object} jsonData - The JSON data containing build configurations.
     * @param {string} buildType - The type of build (e.g., "standard", "full").
     * @param {string} exampleApp - The name of the example app to build.
     * @param {string} buildScript - The build script to execute.
     * @param {string} pathToExampleApp - The path to the example app.
     * @param {string} outputDirectory - The directory to store build outputs.
     */
    constructor(jsonData, buildType, exampleApp, buildScript, pathToExampleApp, outputDirectory) 
    {
        this.#jsonData = jsonData;
        this.#buildType = buildType;
        this.#exampleApp = exampleApp;
        this.#buildScript = buildScript;
        this.#pathToExampleApp = pathToExampleApp;
        this.#outputDirectory = outputDirectory;
    }

    // Private members
    #jsonData;
    #buildType;
    #exampleApp;
    #buildScript;
    #pathToExampleApp;
    #outputDirectory;

    /**
     * Generates a list of build commands based on the JSON data.
     * @returns {string[]} An array of build commands.
     * @throws {Error} If required build information is missing.
     */
    generateCommands() 
    {
        const commands = [];
        const buildTypeData = this.#jsonData[this.#buildType];

        // Check if the build type exists in the JSON data
        if (!buildTypeData) 
        {
            throw new Error(`No build type found for ${this.#buildType}`);
        }

        // Process default build information
        const defaultBuildInfo = buildTypeData["default"];
        if (defaultBuildInfo) 
        {
            defaultBuildInfo.forEach(info => 
            {
                const {
                    boards, arguments: args, projectFileType
                } = info;
                boards.forEach(board => 
                {
                    const pathToExample = this.#resolvePathTemplate(projectFileType);
                    const command = `${this.#buildScript} ${pathToExample} ${this.#outputDirectory} ${board} ${args.join(' ')}`;
                    commands.push(command);
                });
            });
        }

        // Process build information specific to the example app
        const buildInfo = buildTypeData[this.#exampleApp];
        if (!buildInfo && !defaultBuildInfo) 
        {
            throw new Error(`No build information found for ${this.#exampleApp}`);
        }

        if (buildInfo) 
        {
            buildInfo.forEach(info => 
            {
                const {
                    boards, arguments: args, projectFileType
                } = info;
                boards.forEach(board => 
                {
                    const pathToExample = this.#resolvePathTemplate(projectFileType);
                    const command = `${this.#buildScript} ${pathToExample} ${this.#outputDirectory} ${board} ${args.join(' ')}`;
                    commands.push(command);
                });
            });
        }

        return commands;
    }

    /**
     * Resolves path template with project file type.
     * @param {string} projectFileType - The project file type ("slcp" or "slcw").
     * @returns {string} The resolved path with template variables substituted.
     */
    #resolvePathTemplate(projectFileType) 
    {
        // Default to "slcw" 
        const fileType = projectFileType || "slcw";
        
        // Substitute template variables in the path
        return this.#pathToExampleApp.replace(/\{\{projectFileType\}\}/g, fileType);
    }
}

module.exports = { JsonParser };
