export const saveReadingState=()=>{if(!window.rustFoundryState)throw Error('Wait for the page to finish loading.');return window.rustFoundryState.save();};
