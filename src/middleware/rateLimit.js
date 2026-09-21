const rateLimit=require('express-rate-limit'); const json={message:'Too many requests. Please try again later.'};
const publicLimiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,message:json}); const authLimiter=rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:true,legacyHeaders:false,message:json}); module.exports={publicLimiter,authLimiter};
