import Websocket from 'ws'
import {v4 as uuidv4} from 'uuid'

interface Player {
    id: string;
    username: string;
    email : string;
    password: string;
}

interface Room {
    name: string,
    player1: string,
    player2: string,
    state: boolean
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
const rooms: Record<string, any> = {};

const wss = new Websocket.Server({port: 9000})

function addPlayer(ws: any): Player {
    const player: Player = {
        id: uuidv4(),
        username: '',
        email: "",
        password: "",
    };
    players_WS[player.id] = ws;
    players_OBJ[player.id] = player;
    return player;
}

wss.on('connection', function connection(ws){

    ws.on('message', function incoming(message){
        processMessage(message.toString());
    });

    const player = addPlayer(ws);
    console.log(players_OBJ);
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
                console.log("player already exist with this Email");
                const RegisterAction: ServerResponse = {
                    type: "UserAlreadyExistWithThisEmail",
                    parameters: { playerID: playerObj.id},
                }
                players_WS[playerObj.id].send(JSON.stringify(RegisterAction));
                return;
            }
            if(player.username == action.parameters.playerUsername){
                console.log("player already exist with this Username");
                const RegisterAction: ServerResponse = {
                    type: "UserAlreadyExistWithThisUsername",
                    parameters: { playerID: playerObj.id},
                }
                players_WS[playerObj.id].send(JSON.stringify(RegisterAction));
                return;
            }
        }
        playerObj.email = action.parameters.playerEmail;
        playerObj.password = action.parameters.playerPassword;
        playerObj.username = action.parameters.playerUsername;
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
            if(player.id == action.actor){
                if(player.email == action.parameters.playerEmail){
                    // caso a senha esteja correta
                    if(player.password == action.parameters.playerPassword){
                        if(player.username == action.parameters.playerUsername){
                            console.log("Login Sucessful");
                            const LoginAction: ServerResponse = {
                                type: "LoginSucessful",
                                parameters: { playerID: playerObj.id},
                            }
                            players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                            return;  
                        // caso o username esteja errado                      
                        }else{
                            console.log("Authentication Fail: Username Incorrect");
                            const LoginAction: ServerResponse = {
                                type: "LoginFail_UsernameIncorrect",
                                parameters: { playerID: player.id},
                            }
                            players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                            return;
                        }
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
                else{ // caso o email esteja incorreto
                    console.log("Authentication Fail: Email Incorrect");
                    const LoginAction: ServerResponse = {
                        type: "LoginFail_EmailIncorrect",
                        parameters: { playerID: player.id},
                    }
                    players_WS[playerObj.id].send(JSON.stringify(LoginAction));
                    return;
                }
            }
        } // usuario não existe nos registros
        console.log("Authentication Fail: User not exist");
        const LoginAction: ServerResponse = {
            type: "LoginFail_UserNotRegistered",
            parameters: { playerID: playerObj.id},
        }
        players_WS[playerObj.id].send(JSON.stringify(LoginAction));
    }
    if(action.type == "Chat"){
        for (const [playerId, player] of Object.entries(players_WS)) {
            const actionChat: ServerResponse = {
                type: "Chat",
                parameters: 
                {playerID : action.actor, 
                message: action.parameters.message}
            }
            players_WS[playerId].send(JSON.stringify(actionChat));
        }
    }

    if(action.type == "CreateRoom"){
        for (const [roomName, room] of Object.entries(rooms)) {
            if(roomName == action.parameters.roomName){
                const actionCreateRoom: ServerResponse = {
                    type: "RoomAlreadyExist",
                    parameters: {creator : room.player1}
                }
                players_WS[action.actor].send(JSON.stringify(actionCreateRoom));
                return;
            }
        }
        const room : Room = {
            name : action.parameters.roomName,
            player1 : action.parameters.creator,
            player2 : "-",
            state : false
        };
        if(action.parameters.state == "true"){
            room.state = true;
        }else{
            room.state = false;
        }
        rooms[room.name] = room;

        const actionCreateRoom: ServerResponse = {
            type: "RoomCreated",
            parameters: {creator : action.actor, roomName: room.name}
        }
        players_WS[action.actor].send(JSON.stringify(actionCreateRoom));
    }

    if(action.type == "JoinRoom"){
        for (const [roomName, room] of Object.entries(rooms)) {
            if(roomName == action.parameters.roomName){
                if(room.state){
                    room.player2 = action.parameters.playerName;
                    room.state = false;
                    const actionJoinRoom: ServerResponse = {
                        type: "JoinedInRoom",
                        parameters: {playerID : action.actor}
                    }
                    players_WS[action.actor].send(JSON.stringify(actionJoinRoom));
                    return;
                }else{
                    const actionJoinRoom: ServerResponse = {
                        type: "RoomComplete",
                        parameters: {playerID : action.actor}
                    }
                    players_WS[action.actor].send(JSON.stringify(actionJoinRoom));
                    return;
                }
            }
        }
        const actionJoinRoom: ServerResponse = {
            type: "RoomDontExist",
            parameters: {playerID : action.actor}
        }
        players_WS[action.actor].send(JSON.stringify(actionJoinRoom));
    }

    if(action.type == "ExitRoom"){
        for (const [roomName, room] of Object.entries(rooms)) {
            if(action.parameters.room == room)
            {
                if(action.parameters.playerName == room.player1)
                {
                    if(room.player2 != "-"){ // caso exista o player 2
                        room.player1 = room.player2;
                        room.player2 = "-";
                    }else{ // caso não exista
                        delete rooms[roomName];
                    }
                    const actionExitRoom: ServerResponse = {
                        type: "ExitRoomSucessFul",
                        parameters: {player1Name : room.player1, player2Name: room.player2}
                    }
                    players_WS[action.actor].send(JSON.stringify(actionExitRoom));
                }
                return;
            }
        }
    }
}

console.log('WebSocket server started on ws://localhost:9000');
