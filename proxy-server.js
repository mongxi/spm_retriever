const proxyChain = require('proxy-chain');

const server = new proxyChain.Server({
    port: 8090,                          // 代理服务器监听端口
    prepareRequestFunction: ({ request, username, password }) => {
        // 自定义认证逻辑
        if (username !== 'admin' || password !== '123456') {
            return {
                requestAuthentication: true,   // 要求客户端提供用户名/密码
                failMsg: 'Proxy Authentication Required'
            };
        }
        return {};   // 认证通过，继续处理请求
    }
});

server.listen(() => {
    console.log(`代理服务器已启动，监听端口: ${server.port}`);
    console.log(`认证信息: admin / 123456`);
});
