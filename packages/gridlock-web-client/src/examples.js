/**
 * @type {Record<string | "LABEL", string>}
 */
export const EXAMPLES = {
    "LABEL": "ASCII Diagrams",
    "MXCSR":
    ("AEQARABaAAUAWgBlAAEAZQB7AAEAewCcAAEAnADIAAEAyAEKAAEBCgErAAEBKwFMAAEBTAFtAAEBbQGDAAEBgwGZAAEBmQGjABEAAAAAIAGjAa0AIgARAAAgAa0BrwAzAAAABSABrwGxAB8AAAAGIAGxAbMAFAAfAAYgAbMBtQATAAAAByABtQG3AAwAEwAHIAG3AbkAFAAfAAcgAbkBuwATAAAACCABuwG9AAcAEwAIIAG9Ab8ABQAaAAggAb8BwQAUAB8ACCABwQHDABAAAAAJIAHDAcUAAwAQAAkgAcUBxwAFABMACSABxwHJAAIAGAAJIAHJAcsABQAaAAkgAcsBzQAUAB8ACSABzQHPABAAAAAKIAHPAdEABwAQAAogAdEB0wAcABcACiAB0wHVABEAAAALIAHVAdcACAARAAsgAdcB2QAaABkACyAB2QHbABEAAAAMIAHbAd0ACAARAAwgAd0B3wAaABkADCAB3wHhABEAAAANIAHhAeMAIgARAA0gAeMB5QARAAAADiAB5QHnACIAEQAOIAAIABEAAQABAAEABQAgAB0AAAAIAAAAFAATAAAAAQABABEABgAFAAEAAAABAAEAAQABAAEAAAAHAAkAAAACAAEAAAACABYAAAABAAAAEQ==\n"+
     "# Title:         MXCSR                             \n"+
     "# Example from: \"Taking ASCII Drawings Seriously:  \n"+
     "#                How Programmers Diagram Code\"     \n"+
     "#                                                  \n"+
     "#                Figure 6                          \n"+
     "                                                   \n"+
     " Exception Masks---+           +---Exception Flags \n"+
     "                   |           |                   \n"+
     "Flush-to-zero---+  +----+ +----+                   \n"+
     "                |  |    | |    |                   \n"+
     "                FRRMMMMMMDEEEEEE                   \n"+
     "                 ||      |                         \n"+
     "                 ++      +---Denormals-are-zero    \n"+
     "                 |                                 \n"+
     "                 +---Rounding Mode                 \n"),

    "Speech Recognizer":
    ("ACYAJgA8AAQAPABHAAEARwBzAAoAcwCfAAEAnwDLAAEAywDWAAIA1gDeABEAAAAAIADeAOYAIgARAAAgAOYA6AAzAAAABCAA6AD8AAUAAAAFIAD8ARAAFQAFAAUgARABJAAVABoABSABJAE4AAQALwAFIAE4AToABQAAAA8gAToBPAASAAUADyABPAE+ABgAFwAPIAE+AUAABAAvAA8gAUABQgAFAAAAECABQgFEABUABQAQIAFEAUYAFQAaABAgAUYBSAAEAC8AECABSAFMADMAAAARIAAIABEAAQABABEAIAAdAAAAMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAFQABAAEAAQABABUAAQABABUAAQABABUAAQAVAAEAAQABABUAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQAIAAEAAAABAAEAAQArAAA=\n"+
     "# Title:         Speech Recognizer                 \n"+
     "# Example from: \"Taking ASCII Drawings Seriously:  \n"+
     "#                How Programmers Diagram Code\"     \n"+
     "#                                                  \n"+
     "VR UI Thread       Browser Thread         IO Thread\n"+
     "     |                    |                    |   \n"+
     "     |----ActivateVS----->|                    |   \n"+
     "     |                    |-------Start------->|   \n"+
     "     |                    |                    |   \n"+
     "     |                    |<-NotifyStateChange-|   \n"+
     "     |                    |                    |   \n"+
     "     |<--OnSRStateChanged-|                    |   \n"+
     "     |                    |                    |   \n"+
     "     |                    |<--OnSpeechResult---|   \n"+
     "     |<--OnSRStateChanged-|                    |   \n"+
     "     |                 navigate                |   \n"+
     "     |                    |                    |   \n"+
     " VS = voice search, SR = speech recognition        \n"+
     "                                                   \n"),
};
