const fs=require('fs');

exports.handler = async function(context, event, callback) {
    const channel='sms';
    const verify_sid=context.VERIFY_SID;
    const RateLimitKey=context.RATELIMIT_KEY;
    
    const fileName='/block_mcc_mnc.json';
    const file=Runtime.getAssets()[fileName].path;
    const text=fs.readFileSync(file);
    const block=JSON.parse(text);
  
    var client=context.getTwilioClient();
    var response=new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');

  const phoneNumber=event.recipient
  const message=event.body
  const code=message.split(':')[1];
  const client_ip=event.req.ip;
  const RateLimitValue=phoneNumber+client_ip;

    //carrier lookup
    client.lookups.phoneNumbers(phoneNumber)
    .fetch({type: ['carrier']})
    .then ((resp)=>{
      console.log("Lookup Response", resp)
        const to=resp.phoneNumber;
        const mccmnc= resp.carrier.mobile_country_code + resp.carrier.mobile_network_code;
        if (block.includes(mccmnc)){
            console.log('mcc_mnc blocked:',mccmnc);
            response.setStatusCode(401);
            response.setBody({
                success: false,
                error: "Carrier not allowed.",
            });
        return callback(null, response);
        }
        //call Verify API
        client.verify.services(verify_sid)
            .verifications
            .create({
                rateLimits:{[RateLimitKey]: RateLimitValue},
                to:to,
                channel:channel,
                customCode:code,
                })
            .then((verification) => {
                response.setBody(verification);
                callback(null, response);
                })
            .catch ((error)=>{
                response.setStatusCode(401);
                response.setBody(error);
                callback(null, response);
            })


        })
    .catch ((error)=>{
        response.setStatusCode(401);
        response.setBody(error);
        callback(null, response);
    })
    
}
