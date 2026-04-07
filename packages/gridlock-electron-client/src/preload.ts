import { contextBridge, ipcRenderer } from "electron";
import { LoadRequest, ReaddirRequest, SaveRequest } from "./ipc";

contextBridge.exposeInMainWorld('electronAPI', {
    save:    (req: SaveRequest)    => ipcRenderer.invoke("save", req),
    load:    (req: LoadRequest)    => ipcRenderer.invoke("load", req),
    readdir: (req: ReaddirRequest) => ipcRenderer.invoke("readdir", req)
})
