import ls from "lightstreamer-client-node";
import axios from "axios";
import jwt from "jsonwebtoken";
import dotEnv from "dotenv";
import { createUsers } from "./createUsers.js";

dotEnv.config();

const userCounts = process.env.USERS_COUNT ?? 1;
const serverNumber = process.env.SERVER_NO ?? 7;
const lsURL = process.env.LS_URL ?? "https://ls.qoty.digitok.co";

/**
 * @type {[ls.LightstreamerClient, {mobileNumber: number|string}]}
 */
const lsConnections = [];
let loadedUserGames = [];




const prepareAnswerMessageToSend = (options) => {
  let data = {
    date: new Date(),
    msg: "hello world"
  };
  // Joining the data with '|' seperator;
  const message = Object.values(data).join("|");
  return message;
};

/**
 * Start Test Script for LS Testing
 * @param {boolean} isAppointment Is Game is Appointment or not
 * @param {{quizId: string|number, phoneNumber: string|number, token:string, gameToken: string, startGame?: () => Promise<boolean>}} param1 Game Details for App/NonApp Games
 * @returns
 */
export async function  connectLS(
  isAppointment,
  { quizId, phoneNumber, token, gameToken, startGame }
) {
  const lsClient = new ls.LightstreamerClient(lsURL, "IQO_NODE");
  lsClient.connectionOptions.setHttpExtraHeadersOnSessionCreationOnly(true);
  lsClient.connectionOptions.setHttpExtraHeaders({ "IQO-QUIZ-ID": quizId ?? 100});
  // lsClient.connectionDetails.setUser(phoneNumber);
  // lsClient.connectionDetails.setPassword(token);



  let startTime;
  lsClient.addListener({                           
    onServerError: (errorCode, errorMessage) => {
      console.error("Error Code", errorCode);
      console.error("Error Message", errorMessage);
      lsClient.disconnect();
    },
    onStatusChange: async (status) => {
      if (status === "CONNECTED:WS-STREAMING") {
        const endTime = Date.now();
        console.log("time taken to connect (in ms)", endTime - startTime);
        if (!isAppointment && startGame) {
          const isGameStarted = await startGame().catch((e) => {
            console.log("Error in playing Quiz", e);
            throw e;
          });
          if (!isGameStarted) {
            lsClient.disconnect();
          }
        }
      } else if (status === "CONNECTING") {
        startTime = Date.now();
      }
    },
    onListenStart: (lsDataClient) => {
      console.log("Started Listening");
    },
    onListenEnd: (lsDataClient) => {
      console.log("Finished Listening");
    },
  });
  lsClient.connect();
  lsConnections.push([lsClient, { mobileNumber: phoneNumber }]);

  const check = new Promise((resolve, reject) => {




    const gameEnd = subscribeToLS(lsClient, {
      quizID: quizId,
      name: "gameEnd",
      items: ["timestamp", "gameEnded"],
      onItemUpdate: (itemInfo) => {
        const gameEnded = itemInfo.getValue("gameEnded");
        if (gameEnded) {
          //#region Un-subscribe to all events
          gameEnd();
          optionAnalytics();
          //#endregion
          resolve(phoneNumber);
          cleanUpServer(0, phoneNumber, token);
        }
      },
      mobile: phoneNumber,
    });

      




    const optionAnalytics = subscribeToLS(lsClient, {
      quizID: quizId?? 100,
      name: "greetings",
      items: [],
      onItemUpdate: (itemInfo) => {},
      mobile: phoneNumber,
    });
  })
    .then(() => {
      console.log("Game Ended");
      lsClient.disconnect();
    })
    .catch((error) => {
      console.error("Error in Script", error);
    });
  return check;
}

/**
 *
 * @param {ls.LightstreamerClient} lsClient Lightstreamer connected client
 * @param {{quizID: string|number,name: string, items: string[], onItemUpdate: (itemInfo: ls.ItemUpdate) => void, mobile: string|number}} param1 params
 */
export function subscribeToLS(
  lsClient,
  { quizID, name, items, onItemUpdate, mobile }
) {
  const subscribe = new ls.Subscription(
    "DISTINCT",
    [name],
    items
  );

  subscribe.setDataAdapter("DEFAULT")

  subscribe.addListener({
    onItemUpdate: (updateInfo) => {
      let data = {};
      console.log("Message recieved")
      if(name==="greetings"){
        const message =prepareAnswerMessageToSend({
          date: new Date(),
          msg: "hello world"

        })

     const arr =lsConnections.flatMap((s)=> s.filter(((con)=> con)))  
      arr.map(
         (client) =>{
        console.log("Message sent",message)
          client.sendMessage(`${message}`)
         }
       );
       
    
    }
   
      onItemUpdate(updateInfo);
    },
  });

  subscribe.setDataAdapter("DEFAULT");
  lsClient.subscribe(subscribe);

  return () => {
    lsClient.unsubscribe(subscribe);
  };
}

(()=>{
  const data = createUsers(process.env.USERS_COUNT ?? 1)
    loadedUserGames = [...data]
    console.log(loadedUserGames,data,"In app🧮 🧮 🧮 ") 
    data.map((user) => {
      connectLS(true, user);
    });
  })();






// ! TODO: FIXME: ALL Listen LS-Connection Disconnect and exit on all users exiting game
const cleanUpServer = (eventType, userMobile, token) => {
  if (lsConnections.length > 1) {
    const clientIndex = lsConnections.findIndex(
      (client) => client.mobileNumber.toString() == userMobile.toString()
    );
    const client = lsConnections[clientIndex];
    try {
      if (client.disconnect) {
        client.disconnect();
        console.log(
          "Disconnected for user",
          client?.connectionDetails?.getUser()
        );
      }
    } catch (error) {
      console.error("Error in Disconnecting", error);
    }
    lsConnections.splice(clientIndex, 1);
  } else {
    // TODO: DELETE Users API call to clear test data
    if (lsConnections.length > 0) {
      lsConnections[0].disconnect();
      lsConnections.splice(0, 1);
    }
    console.log("Exiting Test...");
    const apiURL = process.env.API;
    axios
      .post(
        `${apiURL}/api/v1/test/offset`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .catch((e) => {
        console.log("Error in cleanup");
      });
    process.exit(eventType);
  }
};

const forceCleanUpServer = (eventType) => {
  lsConnections.map((client) => {
    try {
      if (client.disconnect) {
        client.disconnect();
        console.log(
          "Disconnected for user",
          client?.connectionDetails?.getUser()
        );
      }
    } catch (error) {
      console.error("Error in Disconnecting", error);
    }
  });
  process.exit(eventType);
};

[
  `exit`,
  `SIGINT`,
  `SIGUSR1`,
  `SIGUSR2`,
  `uncaughtException`,
  `SIGTERM`,
].forEach((eventType) => {
  process.on(eventType, forceCleanUpServer);
});
