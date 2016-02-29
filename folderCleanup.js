var fs = require('fs'),
    CONFIG = require("./config"),
    Logger = require("./modules/Logger");

getFolders(CONFIG.SERVER.archiveFolder);

function getFolders(archiveFolder) {
    fs.readdir(archiveFolder, function (err, files) {
        if (err) {
            Logger.err("Error accessing archive folder:", err);
            return;
        } else {
            if (files && files.length > 0) {
                Logger.debug("Folders found:", files.length);
                var len = files.length;
                for (var i = 0; i < len; i++) {
                    var fileName = files[i];
                    var filePath = archiveFolder + fileName;
                    checkFolderAndClean(filePath);
                }
            } else {
                Logger.log("No folders to cleanup");
            }
        }
    });
}
/**
 * Tests if the provided path is a folder and if so will init cleaning this folder
 * @param {string} filePath path to the folder
 */
function checkFolderAndClean(filePath) {
    Logger.debug("Folder:", filePath);
    fs.stat(filePath, function (err, stats) {
        if (err) {
            Logger.err("Error accessing folder:", fileName, err);
            return;
        } else {
            if (stats.isDirectory()) {
                cleanFolder(filePath);
            }
        }
    });
}


/**
 * Removes files from the folder to have only as much files as the number provided
 * @param {string} folderPath path to the folder to clean
 * @param {number} maxFiles   max number of files to have in the folder
 */
function cleanFolder(folderPath) {
    try {
        var maxFiles = CONFIG.SERVER.maxFilesInArchive || 20;
        fs.readdir(folderPath, function (err, files) {
            if (err) {
                Logger.err("Error accessing folder:", folderPath, err);
                return;
            } else {
                if (files && files.length > maxFiles) {
                    Logger.log("Cleaning up", files.length, "files in", folderPath);
                    for (var i = (files.length - maxFiles); i >= 0; i--) {
                        var fileName = files[i];
                        fs.unlinkSync(folderPath + "/" + fileName);
                    }
                } else {
                    Logger.log("No cleanup required in", folderPath);
                }
            }
        });
    } catch (ex) {
        Logger.err("Cleaning Error", folderPath, ex.message);
    }
}