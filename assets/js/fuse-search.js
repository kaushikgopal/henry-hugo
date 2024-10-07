/*
 * Part of the hugo-fuse-search project
 * https://github.com/theys96/hugo-fuse-search/
 * License: https://github.com/Theys96/hugo-fuse-search/blob/master/LICENSE
 *
 * Note: contains parts of code still remaining from the original code this
 * program is based on. Author: Craig Mod.
 * https://gist.github.com/cmod/5410eae147e4318164258742dd053993
*/

// ==========================================
// BASICS
//

function setupSearch() {
    const fusesearch = new FuseSearch();
    const searchbar = new Searchbar(fusesearch);
    return { fusesearch, searchbar };
}


// ==========================================
// CLASSES
//


/* Core search class containing logic for the search engine */
class FuseSearch {
    isInit = false;
    index = "/search.json";
    fuse = null;
    maxResults = 20;
    fuseConfig = {
        shouldSort: true,
        location: 0,
        distance: 100,
        threshold: 0.4,
        minMatchCharLength: 2,
        keys: ['title', 'permalink', 'contents']
    };

    constructor() {
        console.log("hugo-fuse-search: fuse-search created.");
    }

    init() {
        if (!this.isInit) {
            return this.loadSearch();
        }
        return Promise.resolve();
    }

    async loadSearch() {
        try {
            const data = await fetchJSONFile(this.index);
            this.fuse = new Fuse(data, this.fuseConfig);
            this.isInit = true;
            console.log("hugo-fuse-search: Fuse.js was successfully instantiated.");
        } catch (error) {
            console.error("hugo-fuse-search: retrieval of index file was unsuccessful", error);
        }
    }

    isReady() {
        return this.isInit && this.fuse !== null;
    }

    toString() { return "FuseSearch"; }
}

/* Base code for multiple searchbar implementations
 */
class Searchbar {
    constructor(fusesearch) {
        this.search = fusesearch;
        this.element_main = document.getElementById("searchbar");
        this.element_input = document.getElementById('searchbar-input');
        this.element_results = document.getElementById('searchbar-results');
        this.initPromise = this.search.init();
        this.init();
    }

    itemHtml(item, isFirst, isLast) {
        let classes = 'px-2 text-right bg-henryb-dark/95 py-1';

        if (isFirst) classes += ' pt-4';
        if (isLast) classes += ' pb-4';
        if (!isLast || !isFirst) classes += ''; // Add a border between items

        return '<li class="' + classes + '"><a href="' + item.permalink + '" tabindex="0">' +
            '<span class="title text-henryt-lighter">' + item.title + '</span>' +
            '<span class="text text-henryc hidden md:inline"> ' + item.permalink + '</span>' +
            '</a></li>';
    }

    init() {
        this.visible = false;
        this.resultsAvailable = false;

        // Renew search whenever the user types
        this.element_input.addEventListener('keyup', (e) => { this.executeSearch(this.element_input.value); });

        console.log("hugo-fuse-search: Searchbar initiated.");
    }

    // Run the search (which happens whenever the user types)
    async executeSearch(term) {
        if (!this.search.isInit) {
            console.log("hugo-fuse-search: Fuse.js is not ready yet. Waiting for initialization...");
            await this.search.init();
        }

        if (!this.search.isInit) {
            console.error("hugo-fuse-search: Fuse.js initialization failed.");
            return;
        }

        try {
            const results = this.search.fuse.search(term);
            let searchitems = '';

            if (results.length === 0) {  // no results based on what was typed into the input box
                this.resultsAvailable = false;
                searchitems = '';
            } else {  // we got results
                const slicedResults = results.slice(0, this.search.maxResults);
                slicedResults.forEach((item, index) => {
                    if ('item' in item) {
                        const isFirst = index === 0;
                        const isLast = index === slicedResults.length - 1;
                        searchitems += this.itemHtml(item.item, isFirst, isLast);
                    }
                });
                this.resultsAvailable = true;
            }

            this.element_results.innerHTML = searchitems;
        } catch (err) {
            console.error("hugo-fuse-search: search failed:", err);
        }
    }
}


// ==========================================
// HELPER FUNCTIONS
//

/* Fetches JSON file and returns the parsed contents in the callback */
function fetchJSONFile(path) {
    return new Promise((resolve, reject) => {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200) {
                    var data = JSON.parse(httpRequest.responseText);
                    resolve(data);
                } else {
                    reject(new Error(`${httpRequest.status} - ${httpRequest.statusText}`));
                }
            }
        };
        httpRequest.open('GET', path);
        httpRequest.send();
    });
}



// EXPORTS
// At the end of the file, replace the exports with:
export { setupSearch };

