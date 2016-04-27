const path = require("path");
const Apple = require("../src/drivers/Apple");

const EXAMPLE_LIBRARY = path.join(__dirname, "data/Library.xml");

describe("Apple", () => { // Hrm, how much time ya got?
    describe("#parsePlist", function() {
        this.timeout(0);

        it("should parse a sample library", () => {
            return Apple.parsePlist(EXAMPLE_LIBRARY);
        });
    });

    describe("#importFromFile", function() {
        it("should read a library from a file", () => {
            return Apple.importFromFile(EXAMPLE_LIBRARY);
        });
    });
});