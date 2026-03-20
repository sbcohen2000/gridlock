/**
 * @type {Record<string, string>}
 */
export const EXAMPLES = {
    "MXCSR":
    ("AEQARABYAAUAWABiAAEAYgB2AAEAdgCUAAEAlAC8AAEAvAD4AAEA+AEWAAEBFgE0AAEBNAFSAAEBUgFmAAEBZgF6AAEBegGEABEAAAAAAYQBjgAiABEAAAGOAZAAMwAAAAUBkAGSAB8AAAAGAZIBlAAUAB8ABgGUAZYAEwAAAAcBlgGYAAwAEwAHAZgBmgAUAB8ABwGaAZwAEwAAAAgBnAGeAAcAEwAIAZ4BoAAFABoACAGgAaIAFAAfAAgBogGkABAAAAAJAaQBpgADABAACQGmAagABQATAAkBqAGqAAIAGAAJAaoBrAAFABoACQGsAa4AFAAfAAkBrgGwABAAAAAKAbABsgAHABAACgGyAbQAHAAXAAoBtAG2ABEAAAALAbYBuAAIABEACwG4AboAGgAZAAsBugG8ABEAAAAMAbwBvgAIABEADAG+AcAAGgAZAAwBwAHCABEAAAANAcIBxAAiABEADQHEAcYAEQAAAA4BxgHIACIAEQAOAAgAEQABAAEAAQAFACAAHQAAAAgAAAAUABMAAAABAAEAEQAGAAUAAQAAAAEAAQABAAEAAQAAAAcACQAAAAIAAQAAAAIAFgAAAAEAAAAR\n"+
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
    ("ACYAJgA6AAQAOgBEAAEARABsAAoAbACUAAEAlAC8AAEAvADGAAIAxgDOABEAAAAAAM4A1gAiABEAAADWANgAMwAAAAQA2ADsAAUAAAAFAOwBAAAVAAUABQEAARQAFQAaAAUBFAEoAAQALwAFASgBKgAFAAAADwEqASwAEgAFAA8BLAEuABgAFwAPAS4BMAAEAC8ADwEwATIABQAAABABMgE0ABUABQAQATQBNgAVABoAEAE2ATgABAAvABABOAE8ADMAAAARAAgAEQABAAEAEQAgAB0AAAAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAVAAEAAQABAAEAFQABAAEAFQABAAEAFQABABUAAQABAAEAFQABAAEAAQABAAEAAQABAAEAAQABAAEAAAABAAgAAQAAAAEAAQABACsAAA==\n"+
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
