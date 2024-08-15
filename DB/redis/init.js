const { createClient } = require("redis");

const iniciarRedisDB = async () => {
  try{
    const client = createClient();
    client.on("error", err => console.log("Redis Client Error", err));
    await client.connect();
    const isReady = client.isReady;
    console.log("Redis is ready: ", isReady)
    // console.log(isReady);
    // console.log("Conexión a Redis exitosa!");
    return client;
  } catch(e){
    console.error("Error conectando redis", e);
  }

};

module.exports.iniciarRedisDB = iniciarRedisDB;
