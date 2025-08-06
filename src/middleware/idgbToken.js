require("dotenv").config({path: "../"})

let token = null

async function verifyToken() {
    if (token) return token;

    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`, {
        method: "POST"
    })
    const result = await response.json()
    

    console.log(process.env.CLIENT_ID)
    // console.log("response => ",response)
    // console.log("JSON =>", result)
}

verifyToken()

// const token = verifyToken()

// console.log("token result", token)