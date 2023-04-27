import axios from "axios";
import jwt from "jsonwebtoken";


/**
 * It creates the users, creates games for respective user, loads the game, and returns the users
 * @param {number|string} totalUserCount - The number of users you want to create.
 * @returns {{quizId: number|string, token, phoneNumber, gameToken, startGame?: () => Promise<boolean>}} User with phone number, token and gameToken.
 */
export const createUsers = (totalUserCount) => {

  let loadedUserGames = [];
  const INITIAL_PHONE_NUMBER= Number.parseInt(process.env.INITIAL_PHONE_NUMBER) ??5000000000;
    for (let i=INITIAL_PHONE_NUMBER;  i< Number.parseInt(INITIAL_PHONE_NUMBER)+ Number.parseInt(totalUserCount ?? 10); i+=1) {
      const initalId = i+1
      const token = jwt.sign(
        {
          id: initalId-INITIAL_PHONE_NUMBER ,
          name: `Test User ${i}`,
          username: `tesUser${i}`,
          email: `testuser${i}@yahoo.com`,
          avatar:
            "https://foobucketlambdanew.s3.us-east-2.amazonaws.com/gender_profile/DefaultFemale.png",
          phone: `${i}`,
          school_id: "1000001",
          zone: "Ahmedabad",
          iat: 1666000941,
          exp: 4258000941,
        },
        "supersecret"
      );
      console.log("token", token);

          loadedUserGames.push({
            token,
            phoneNumber: INITIAL_PHONE_NUMBER,
          });
    }
  return loadedUserGames;
};
