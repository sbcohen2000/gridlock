export interface SaveRequest {
    /** The path of the file to save. */
    path: string;
    /** The contents of the file to save. */
    contents: string;
}

export type SaveResponse = {
    /** An error, if the file couldn't be saved. */
    error?: string;
}

export interface LoadRequest {
    /** The path of the file to load. */
    path: string;
}

export type LoadResponse = {
    /** The contents of the loaded file. */
    contents: string;
} | {
    /** An error, if the file couldn't be loaded. */
    error: string;
};

export interface ReaddirRequest {
    /** The path of the directory to read. */
    path: string;
}

export type ReaddirEntry = {
    parentPath: string,
    name: string,
    type: "file" | "directory" | "other"
};

export type ReaddirResponse = {
    /**
     * The directory contents, represented as a list of objects.
     */
    entries: ReaddirEntry[];
} | {
    /** An error, if the directory couldn't be read. */
    error: string;
};

/** The API exposed to the renderer process via the context bridge. */
export interface ElectronAPI {
    save(req: SaveRequest):       Promise<SaveResponse>;
    load(req: LoadRequest):       Promise<LoadResponse>;
    readdir(req: ReaddirRequest): Promise<ReaddirResponse>;
}
