"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service = require("../services");
const route_1 = require("../route");
class WechatRoute extends route_1.Route.BaseRoute {
    doAction(action, method, next) {
        console.log(action);
        switch (action) {
            case 'oauth': return this.oauth;
            case 'jssdk': return this.getJSSDKSignature;
            case 'payment': return this.service.wechat.getPayReply();
            case 'create-menu': return this.createMenu;
            case 'remove-menu': return this.removeMenu;
            default: return this.notFound;
        }
    }
    /**创建微信公众号按钮 */
    async createMenu() {
        let action = await this.service.wechat.createMenu('');
        this.res.json({ ok: true, data: action });
    }
    before() { this.next(); }
    after() { }
    constructor() {
        super();
        // console.log('Wechat Service', service);
    }
    async removeMenu() {
        let action = await this.service.wechat.removeMenu();
        this.res.json({
            ok: true, data: action
        });
    }
    async payment() {
        let money = this.req.body;
        let ip = this.service.tools.pureIp(this.req.ip);
        var payargs = await this.service.wechat.wechatReturnMoney({
            attach: '',
            spbill_create_ip: ip,
            out_trade_no: '' + new Date().toString(),
            trade_type: 'JSAPI',
            openid: this.req.session.user.openid,
            body: '',
            total_fee: money
        });
        console.log(payargs);
        this.res.end(payargs);
    }
    oauth(req, res) {
        var code = req.query.code;
        var parent = req.query.parent;
        var taskId = req.query.taskId;
        // console.log(req.query, code);
        console.log('services', service);
        this.service.wechat.client.getAccessToken(code, (err, result) => {
            // console.dir(err);
            // console.dir(result); 
            var accessToken = result.data.access_token;
            var openid = result.data.openid;
            // console.log('token=' + accessToken);
            req.session.accessToken = accessToken;
            res.locals.accessToken = accessToken;
            console.log('openid=' + openid);
            service.wechat.client.getUser(openid, async function (err, result) {
                let user = await service.db.userModel.findOne({ openid }).exec();
                if (user) {
                    await user.update({ accessToken }).exec();
                }
                else {
                    result.accessToken = accessToken;
                    if (parent) {
                        result.parent = parent;
                        console.log('新用户的师傅是' + parent);
                        await service.db.userModel.findByIdAndUpdate(parent, { $inc: { todayStudent: 1, totalStudent: 1 } }).exec();
                    }
                    else {
                        console.log('新用户没有师傅');
                    }
                    user = await new service.db.userModel(result).save();
                }
                req.session.user = user;
                res.locals.user = user;
                // console.log('session user', req.session.user);
                if (taskId) {
                    res.redirect('/share/index');
                    // res.redirect('/task/' + taskId)
                }
                else {
                    res.redirect('/share/index?openid=' + openid);
                }
            });
        }, (err, result) => {
        });
    }
    notFound(req, res) {
        res.render('error');
    }
    getJSSDKSignature(req, res) {
        service.wechat.wx.jssdk.getSignatureByURL(req.query.url, function (signatureData) {
            res.json(signatureData);
        });
    }
}
exports.WechatRoute = WechatRoute;
