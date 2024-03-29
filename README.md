Note, if you use Auth0 MFA, please take a look at [this blog post](https://www.twilio.com/blog/configure-auth0-mfa-twilio-verify) on how to use Twilio Verify with Auth0 MFA

# Auth0 Passwordless Login with Twilio Verify
Auth0 supports [passwordless loign via either SMS or Email](https://auth0.com/docs/connections/passwordless). By default, Auth0 uses [Twilio programmable messaging API](https://www.twilio.com/docs/sms/api) to send OTP via SMS. However, Auth0 also allows you to [setup custom SMS gateway for passwordless login](https://auth0.com/docs/connections/passwordless/use-sms-gateway-passwordless). This project will show you how to setup Auth0 to use [Twilio Verify](https://www.twilio.com/docs/verify/api) for passwordless login.
## Why custom SMS gateway with Twilio Verify?
Twilio Verify is a dedicated, fully managed, turn-key omnichannle verification solution. 

* you want the benefit of Twilio Verify's global reach, enhanced SMS OTP deliverity, build-in reducency, multilple languages support etc.
* you want to be protected from [sms pumping fraud](https://www.twilio.com/docs/verify/preventing-toll-fraud) with [Twilio Verify Fraud Guard](https://www.twilio.com/docs/verify/preventing-toll-fraud/sms-fraud-guard)
* you want to take advantage of Twilio Verify build-in service rate limit
* you want to leverage some advanced fraud prevention feature in Verify such as [programmable rate limits](https://www.twilio.com/docs/verify/api/programmable-rate-limits)
* you need the flexiblity to carry out additional checking before sending the SMS OTP. E.g for fraud prevention purpose, you want to block a phone number or a carrier or a country
* you want to take advantage of Twilio Verify multiple channels, instead of sending OTP via SMS, you want to use other channels such as voice call, email and or WhatsApp to delivery the OTP

## What does this custom SMS gateway do?
it has the following features
1. It uses Twilio carrier Lookup API to check the phone number and get carrier detail, aka, mobile country code (mcc) and mobile network code (mnc). The phone number will be blocked if its mcc and mnc is on the list of block_mcc_mnc.json. The primary purpose is to prevant toll fraud
2. It uses Twilio Verify [programmable rate limits](https://www.twilio.com/docs/verify/api/programmable-rate-limits) feature. A service rate limit called 'ip_and_phone' is created and is used in this example. If you create a service rate limit using a different name, make sure to update the Twilio Function variable `RATELIMIT_KEY` to the name you choosed

## What else can you do (or a to-do-list)?
1. add authenticated request, i.e. the TWilio function will authenticate the request from Auth0
2. to use other Verify channel to delivery OTP such as Email, Voice call and or WhatsApp

## Pre-requisites
* Auth0 account
* A Twilio Verify Service. [Create one in the TWilio Console](https://www.twilio.com/console/verify/services). Don't have a Twilio account, [signup free](https://www.twilio.com/try-twilio)!

## Setup custom SMS gateway for Auth0 Passwordless connection
1. Please follow Auth0 online instruction to [setup passwordless connection](https://auth0.com/docs/connections/passwordless/authentication-factors/sms-otp) first, then
2. Follow the instruction to [setup custom SMS gateway](https://auth0.com/docs/connections/passwordless/use-sms-gateway-passwordless). Please note, you will need the SMS gateway URL, please see the Twilio Function section below for the URL.

## Setup Twilio Verify and Twilio Function
### Setup Twilio Verify
Pleae follow [this link](https://www.twilio.com/console/verify/services) to create a new Verify service. Note down the Verify service SID, a long string start with VA (VAxxxxxxxxx......)
Please [contact Twilio Sales](https://www.twilio.com/help/sales) to enable custom code feature for above Verify service. 
### Setup Twilio Function as the custom SMS Gateway
[Twilio Functions](https://www.twilio.com/docs/runtime/functions) is a serverless environment that empowers developers to quickly and easily create production-grade, event-driven Twilio applications that scale with their businesses.
1. [Create a new service](https://www.twilio.com/docs/runtime/functions/create-service), called it Auth0 (or anything you like)
2. Add a [new function](https://www.twilio.com/docs/runtime/functions/functions-editor) and give it a name, for example, PasswordlessLogin. 
3. Change the function's visibility from [protected to public](https://www.twilio.com/docs/runtime/functions-assets-api/api/understanding-visibility-public-private-and-protected-functions-and-assets)
4. Copy the code from [this repo](https://github.com/mingchaoma/Auth0-Passwordless-Login-with-Twilio-Verify/blob/main/functions/Auth0_Verify_Passwordless.js) to your function PasswordlessLogin and save it
5. Add a [new asset](https://www.twilio.com/docs/runtime/functions/functions-editor#add-asset) and name it as block_mcc_mnc.json and copy the content from [this file](https://github.com/mingchaoma/Auth0-Passwordless-Login-with-Twilio-Verify/blob/main/assets/block_mcc_mnc.json), change the visibility from [protected to private](https://www.twilio.com/docs/runtime/functions-assets-api/api/understanding-visibility-public-private-and-protected-functions-and-assets) and save it. Check [here](https://www.mcc-mnc.com/) for more on MCC and MNC.
6. Setup following [Environment variables](https://www.twilio.com/docs/runtime/functions/variables)

Variable | Value 
--- | --- 
`VERIFY_SID`| VAxxxxxxxxx (the Verify service that you created at previous steps) 
`RATELIMIT_KEY` | ip_and_phone 

7. Update [dependencies](https://www.twilio.com/docs/runtime/functions/dependencies): update Twilio to the latest version (3.67.2, at the time of writing)
8. Save and Deploy
9. Take a note of your Twilio Function URL, in this example, it will be something like https://auth0-xxxx.twil.io/PasswordlessLogin. This is the URL that you will use when setting up the custom SMS gateway

## Call Verify Feedback API and enable Twilio Verify Fraud Guard
In order to benefit from Twilio Verify Fraud Guard, you must call Twilio [Verify Feedback API](https://www.twilio.com/docs/verify/api/customization-options#custom-verification-codes) to update OTP status
### Create Custom Log Streamms Using Webhook
Please follow this instruction to [create custom log streams using webhook](https://auth0.com/docs/customize/log-streams/custom-log-streams). Please note, you will need to create [another Twilio function](https://www.twilio.com/docs/serverless/functions-assets/functions#get-started-with-serverless-and-twilio-functions) (acting as webhook receiver) and use it to receive the webhook call from Auth0 log stream. The Payload URL of custom log stream will be the the Twilio Function URL. 

The Twilio Function will receive the webhook call from Auth0 log stream and parse the payload (for example, the successful login event and the phone number used for login), then call Verify Feedback API. For example, if you use Auth0 passwordless login and then issue an access token, you can capture the event ["Success Exchange Token Exchange"](https://auth0.com/docs/deploy-monitor/logs/log-event-filters) which indicates a successful login with the OTP and then call Twilio Verify feedback API (you only need to call Verify feedback API for successful login event). If you are not sure, you can always check [what log events](https://auth0.com/docs/deploy-monitor/logs/view-log-events) are triggered for a successful login with the OTP and then use them as the triggers to call Verify feedback API.
### Enable Twilio Verify Fraud Guard
Please follow this instruction to enable [Verify Fraud Gurad](https://www.twilio.com/docs/verify/preventing-toll-fraud/sms-fraud-guard). It is extremely important that you use Verify feedback API and enable Fraud Gurad feature when using Auth0 passwordless login. We had seen many SMS pumping victims, so you have been warned. 

