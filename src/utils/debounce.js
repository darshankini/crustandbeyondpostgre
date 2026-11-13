export const debounce = (callback,delay = 500) => {
    let timer;

    const debouncedFunction = (...args) => {
        
        clearTimeout(timer);

         timer = setTimeout(() => {
            callback(...args);
        },delay);
    }
    
    debouncedFunction.cancel = () => {
        clearTimeout(timer);
    }

    return debouncedFunction;
}