const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const fs = require("fs");
const path = require('path');

// web scrapping endpoint
router.post('/scrape', async (req, res) => {
    const { username, password, contestName } = req.body;
    let allFindings = [];
    let allDuplicates = [];

    (async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        try {
            let finalUrl = `https://code4rena.com/evaluate/${contestName}/findings?page=1&risk=High&risk=Medium`;
    
            console.log('Navigating to the final URL...');
            await page.goto(finalUrl, { waitUntil: 'networkidle2' });

            // Use XPath to locate the button that redirects to the login page
            const redirectButtonXPath = '/html/body/div/main/section/div/div/a';

            console.log(`Waiting for the redirect button (${redirectButtonXPath}) to appear...`);
            await page.waitForFunction(
                (xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element && element.offsetParent !== null; // Ensure it's visible
                }, { timeout: 5000 }, redirectButtonXPath
            );

            console.log('Redirect button found. Clicking it...');
            await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) element.click();
            }, redirectButtonXPath);

            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            console.log('Redirected to the login page.');

            console.log('Filling in the login form...');
            await page.waitForSelector('#username', { visible: true });
            await page.type('#username', username);
            await page.type('#password', password);

            const loginButtonXPath = '/html/body/div/div[2]/div/div[1]/div[2]/div/div[2]/form/div/button';

            console.log(`Waiting for the login button (${loginButtonXPath}) to appear...`);
            await page.waitForFunction(
                (xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element && element.offsetParent !== null; // Ensure it's visible
                }, { timeout: 5000 }, loginButtonXPath
            );

            console.log('Login button found. Clicking it...');
            await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) element.click();
            }, loginButtonXPath);

            await page.waitForNavigation({ waitUntil: 'networkidle2' });

            const currentUrl = page.url();
            if (currentUrl === finalUrl) {
                console.log('Successfully logged in and redirected to the final URL.');
            } else {
                console.log(`Unexpected redirection. Current URL: ${currentUrl}`);
            }

            await page.waitForSelector('.pagination-row__page-count', { visible: true });
            const lastPage = await page.evaluate(async () => {
                const paginationDiv = document.querySelector('.pagination-row__page-count strong');
                if (!paginationDiv) return 1; // Default to 1 if not found
                const text = paginationDiv.innerText.trim();
                const match = text.match(/of (\d+)/);
                return match ? parseInt(match[1]) : 1; // Extract "y" from "x of y"
            });
            console.log(`lastPage: ${lastPage}`);

            let  currentPage = 1;
            while (currentPage <= lastPage) {
                if (currentPage !== 1) {
                    console.log(`Navigating to URL: ${finalUrl}`);
                    await page.goto(finalUrl, { waitUntil: 'networkidle2' });
                }

                // ---- SCRAPING FINDINGS AND DUPLICATES ----
                console.log('Waiting for findings table to load...');
                await page.waitForSelector('.finding-row--card-header', { visible: true });

                //These are temp aux arrays
                const { findings, duplicates } = await page.evaluate(() => {
                    let findingsList = [];
                    let duplicatesList = [];
                
                    // Select all findings
                    const findingsElements = document.querySelectorAll('.finding-row--card-header');
                    findingsElements.forEach(finding => {
                        findingsList.push(finding.innerText.trim()); // Extract text of finding
                    });
                
                    // Select all duplicate count elements
                    const duplicatesElements = document.querySelectorAll('.finding-row--card-footer span');
                    duplicatesElements.forEach(duplicate => {
                    const text = duplicate.innerText.trim();

                    let match = text.match(/Showing all (\d+) submissions/);
                    if (match) {
                        duplicatesList.push(parseInt(match[1])); // Extract "xx" from "Showing all xx submissions"
                    } else {
                        match = text.match(/Showing \d+\/(\d+) submissions/);
                        if (match) {
                            duplicatesList.push(parseInt(match[1])); // Extract "yy" from "Showing xx/yy submissions"
                        } else {
                            duplicatesList.push(0); // Default to 0 if nothing is found
                        }
                    }
                    });
                    return { findings: findingsList, duplicates: duplicatesList };
                });
        
                //Pushing aux arrays in the finals
                for(let i = 0; i < findings.length; i++){ 
                    allFindings.push(findings[i]);
                    allDuplicates.push(duplicates[i]);
                }

                currentPage++;
                finalUrl = `https://code4rena.com/evaluate/2024-11-concrete/findings?page=${currentPage}&risk=High&risk=Medium`;
            }

            console.log('Findings:', allFindings);
            console.log('Duplicates:', allDuplicates);

            // Function to parse findings into JSON format
            function parseFindings(array) {
                return array.map(item => {
                    const cleanedItem = item.replace(/\t/g, " "); // Replace all tabs with spaces
                    const parts = cleanedItem.split("\n").map(part => part.trim()).filter(Boolean);
                    
                    return {
                    id: parts[0],             // Finding ID
                    severity: parts[1],       // Severity level (e.g., High, Medium)
                    description: parts[2],    // Finding description
                    status: parts.slice(3)    // All remaining statuses
                    };
                });
            }

            // Convert findings array into JSON
            const findingsJSON = parseFindings(allFindings);

            // Print JSON output
            console.log(JSON.stringify(findingsJSON, null, 2));

            //Filtering by severity
            const filterBySeverity = findingsJSON.filter(finding => finding.severity === "High");

            // Print JSON output
            console.log("Showing all the Highs");
            console.log(JSON.stringify(filterBySeverity, null, 2));

            //DATA FOLDER
            //Check if data folder already exists, if its not, create it
            const dataFolder = path.join(__dirname, `../../data`);
            if (!fs.existsSync(dataFolder)) {
                fs.mkdirSync(dataFolder);
            }

            //Check if new folder already exists, if its not, create it
            const contestFolderPath = path.join(dataFolder, contestName);
            if (!fs.existsSync(contestFolderPath)) {
                fs.mkdirSync(contestFolderPath);
            } 

            //GENERATE JSON FILE
            const contestFilePath = `${contestFolderPath}/${contestName}.json`;  // Saves inside a "data" folder in the current directory
            fs.writeFile(contestFilePath, JSON.stringify(findingsJSON, null, 2), 'utf-8', (err) => {
                if (err) {
                    console.log('Error writing file');
                } else {
                    console.log('JSON file has been saved successfully');
                }
            })

            const duplicatesFilePath = `${contestFolderPath}/duplicates.json`;
            fs.writeFile(duplicatesFilePath, JSON.stringify(allDuplicates, null, 2), 'utf-8', (err) => {
                if (err) {
                    console.log('Error writing file');
                } else {
                    console.log('JSON file has been saved successfully');
                }
            })

            console.log(`The findings json has: ${allFindings.length} elements`);
            console.log(`The findings json has: ${allDuplicates.length} elements`);
            
            res.json({ findings: findingsJSON, duplicates: allDuplicates });
    } catch (error) {
        console.error('An error occurred during the process:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await browser.close();
    }
    })();
});

module.exports = router;