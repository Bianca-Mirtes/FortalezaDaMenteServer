import Websocket from 'ws'
import {v4 as uuidv4} from 'uuid'

interface Player {
    id: string;
    email : string;
    password: string;
}

interface Action {
    type: string;
    actor: string;
    parameters: Record<string, string>;
}

interface ServerResponse {
    type: string;
    parameters: Record<string, string>;
}

const players_WS: Record<string, any> = {};
const players_OBJ: Record<string, any> = {};
var playerOneCurrent;
var playerTwoCurrent;
var count=0;

const wss = new Websocket.Server({port: 9000})

function addPlayer(ws: any): Player {
    const player: Player = {
        id: uuidv4(),
        email: "",
        password: "",
    };
    players_WS[player.id] = ws;
    return player;
}

wss.on('connection', function connection(ws){

    ws.on('message', function incoming(message){
        processMessage(message.toString());
    });

    const player = addPlayer(ws);
    players_OBJ[player.id] = player;
    const wellcomeAction: ServerResponse = {
        type: "Welcome",
        parameters: { playerID: player.id},
    }
    ws.send(JSON.stringify(wellcomeAction));
    console.log("enviado", wellcomeAction);

    ws.on("error", (err) => {
        console.log("error", err);
    })

    ws.on("close", () => {
        console.log("close")
        delete players_WS[player.id]
        delete players_OBJ[player.id];
      })
});
6
function processMessage(message : string){
    const action: Action = JSON.parse(message);

    if(action.type == "Register"){
        const playerObj = players_OBJ[action.actor];
        for (const [playerId, player] of Object.entries(players_OBJ)) {
            if(player.email == action.parameters.playerEmail){
                console.log("player already exist");
                const RegisterAction: ServerResponse = {
                    type: "UserAlreadyExist",
                    parameters: { playerID: playerObj.id},
                }
                players_WS[playerObj.id].send(JSON.stringify(RegisterAction));
                return;
            }
        }
        playerObj.email = action.parameters.playerEmail;
        playerObj.password = action.parameters.playerPassword;
        console.log("Register complete with sucessful");
        const RegisterAction: ServerResponse = {
            type: "RegisterSucessful",
            parameters: { playerID: playerObj.id},
        }
        players_WS[playerObj.id].send(JSON.stringify(RegisterAction));
    }

    if(action.type == "Login"){
        const playerObj = players_OBJ[action.actor];

        for (const [playerId, player] of Object.entries(players_OBJ)) {
            if(player.email == action.parameters.playerEmail){
                // caso a senha esteja correta
                if(player.password == action.parameters.playerPassword){
                    console.log("Login Sucessful");
                    const LoginAction: ServerResponse = {
                        type: "LoginSucessful",
                        parameters: { playerID: playerObj.id},
                    }
                    players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                    return;
                 // caso a senha esteja errada
                }else{
                    console.log("Authentication Fail: Password Incorrect");
                    const LoginAction: ServerResponse = {
                        type: "LoginFail_PasswordIncorrect",
                        parameters: { playerID: player.id},
                    }
                    players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                    return;
                }
            }
            if(player.password == action.parameters.playerPassword){
                // caso o login esteja correto
                if(player.email == action.parameters.playerEmail){
                    console.log("Authentication Sucessful");
                    const LoginAction: ServerResponse = {
                        type: "LoginSucessful",
                        parameters: { playerID: player.id},
                    }
                    players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                    return;
                // caso o email esteja incorreto
                }else{
                    console.log("Authentication Fail: Email Incorrect");
                    const LoginAction: ServerResponse = {
                        type: "LoginFail_EmailIncorrect",
                        parameters: { playerID: player.id},
                    }
                    players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                    return;
                }
            }
        }
        console.log("Authentication Fail: User not exist");
        const LoginAction: ServerResponse = {
            type: "LoginFail_UserNotRegistered",
            parameters: { playerID: playerObj.id},
        }
        players_WS[playerObj.id].send(JSON.stringify(LoginAction));
    }
}

console.log('WebSocket server started on ws://localhost:9000');