import * as fsp from "node:fs/promises";
import * as path from "path";
import {
    LoadRequest,
    LoadResponse,
    SaveRequest,
    SaveResponse,
    ReaddirRequest,
    ReaddirResponse,
    ReaddirEntry
} from "./ipc";
import { app, BrowserWindow, IpcMainEvent, ipcMain } from "electron";

/*****************************************************************************/
/** IPC Endpoints                                                           **/

/**
 * Check if the file at the given path exists.
 */
async function fileExists(path: string): Promise<boolean> {
    try {
        await fsp.stat(path);
    } catch(err) {
        if(err.code === "ENOENT") {
            return false;
        } else {
            throw new Error(`Error checking if file exists: ${err}`);
        }
    }
    return true;
}

/**
 * Find a filename which is in the same directory as `path` but isn't
 * in the directory.
 */
async function findTmpNmAtPath(p: string): Promise<string> {
    const basNm = path.basename(p);
    const dirNm = path.dirname(p);

    const pfx = () =>
        Array
            .from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
            .join("");

    let tmpNm = path.join(basNm, `${pfx()}_${dirNm}`);
    while(await fileExists(tmpNm)) {
        tmpNm = path.join(basNm, `${pfx()}_${dirNm}`);
    }

    return tmpNm;
}

async function handleSave(event: IpcMainEvent, req: SaveRequest): Promise<SaveResponse> {
    void event;

    let res: SaveResponse;
    try {
        // Write the contents out to a temporary file in the same
        // directory (filename prefixed with `#`).
        const tmpNm = await findTmpNmAtPath(req.path);
        await fsp.writeFile(tmpNm, req.contents, { mode: "wx" });

        // Then, if that worked, move the tmp file onto the new file.
        await fsp.rename(tmpNm, req.path);

        // Delete the tmp file, but don't fail completely if we can't.
        try {
            await fsp.rm(tmpNm, { force: true });
        } catch(err) {
            console.warn(`Couldn't delete tmpfile: ${err}`);
        }

        res = {};
    } catch(err) {
        res.error = err;
    }

    return res;
}

async function handleLoad(event: IpcMainEvent, req: LoadRequest): Promise<LoadResponse> {
    void event;

    try {
        const contents = await fsp.readFile(req.path, { encoding: "utf8" });
        return { contents };
    } catch(err) {
        return { error: err };
    }
}

async function handleReaddir(event: IpcMainEvent, req: ReaddirRequest): Promise<ReaddirResponse> {
    void event;

    try {
        const entries: ReaddirEntry[] = (await fsp.readdir(req.path, { withFileTypes: true })).map(dirent => {
            const type = dirent.isFile() ? "file" : (dirent.isDirectory() ? "directory" : "other");
            const res: ReaddirEntry = {
                parentPath: dirent.parentPath,
                name: dirent.name,
                type
            };
            return res;
        });
        return { entries };
    } catch(err) {
        return { error: err };
    }
}

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
        width: 800,
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
}

app.whenReady().then(() => {
    ipcMain.handle("save", handleSave);
    ipcMain.handle("load", handleLoad);
    ipcMain.handle("readdir", handleReaddir);
    createWindow();

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    app.quit();
});
