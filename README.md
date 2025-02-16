# Installation
## Step 1: 
### Windows:
Install wsl2. Note: Only works on wsl2.

the newest node version is recommended.

## Step 2: Install Node Dependencies
`npm install`

## Step 3: Set Up Environment Variables
set up your `.env` file according to the `.env.example`
- Run `mv .env.example .env`, and update variables as needed.

### Windows (wsl2): 
- Should work with port 5000

### Mac
- Recommended to assign port 50000

## Step 4: Install chrome for puppeter.
`npx puppeteer browsers install chrome`

<br>

# Execution
## Step 1: Start the Server
`npm start`
- start the server in one terminal.

## Step 2: Generate JSON Files
`npm queryData.js`
- do the requests to the endpoint
    - 2 json files will be generated under the folder `data/<contestName>/`
        - They will be uploaded to the frontend app.