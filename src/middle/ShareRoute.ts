import { Route } from '../route';
import { WeixinOrder } from '../services/wechat';
import service = require('../services');
import { ITaskRecord } from '../models/TaskRecord';
@Route.Views('share')
export class ShareRoute extends Route.BaseRoute implements Route.IRoute {
    doAction(action: string, method: string) {
        switch (action) {
            case 'index': return this.index;
            case 'recruit-student': return this.recruitStudent;
            case 'person-center': return this.personCenter;
            case 'full-info': return method == this.GET ? this.fullInfoPage : this.fixFullInfo;
            case 'publish': return method == this.GET ? this.publishPage : this.publishTask;
            case 'payTaskMoney': return this.payTaskMoney;
            case 'shop-center': return this.shopCenter;
            case 'student-money': return this.studentMoney;
            case 'myMoney': return this.myMoney;
            case 'taskDetail': return this.taskDetail;
            case 'getMoney': return this.GET == method ? this.getMoney : this.getMoneyDo;
            case 'guide': return this.guide;
            case 'task-list': switch (method) {
                case 'delete': return this.taskList;
                case 'post': return this.taskList;
                case 'put': return this.taskList;
                default: return this.taskList;
            };
            case 'get-money-record': return this.getMoneyRecord;
            case 'fans-money': return this.fansMoney;
            case 'money-log': return this.moneyLog;
            case 'share-money': return this.shareMoney;
            case 'task-page': return this.taskPage;

            default: return this.index;

        }
    }

    async taskPage() {

        let page = this.req.query.page || 0;
        let taskTag = this.req.query.taskTag;
        let tasks = [];
        if (taskTag) {
            tasks = await this.db.taskModel.find({ taskTag }).skip(10 * page).limit(10).exec();
        } else {
            tasks = await this.db.taskModel.find().skip(10 * page).limit(10).exec();
        }
        this.res.json({ ok: true, data: tasks });



    }
    async shareMoney() {
        let taskRecords = await this.db.taskRecordModel
            .find({ 'shareDetail.user': this.req.session.user._id.toString() })
            .populate('task').exec();
        if (taskRecords.length > 0) {
            console.log(JSON.stringify(taskRecords[0].shareDetail));
        } else {
            console.log('taskRecords')
        }
        this.render('share-money', { taskRecords });
    }
    constructor() {
        super();
    }
    before() {
        this.next();
    }
    after() {
        this.next();
    }
    async index(req: Route.Request, res: Route.Response) {
        // req.query
        let { taskTag, openid } = req.query;

        let user = req.session.user;
        // this.service.wechat.payRedpackOne({ money: 100, openid: user.openid });
        // console.log('user', user);
        if (openid) {
            console.log('openid :', openid);
            user = await this.service.db.userModel.findOne({ openid }).exec();
        }
        let taskTags = await this.service.db.taskTagModel.find().exec();
        let tasks = [];
        if (taskTag) {
            tasks = await this.service.db.taskModel.find({ taskTag }).limit(10).exec();
        } else {
            tasks = await this.service.db.taskModel.find().limit(10).exec();
        }
        await this.res.render('share/index', { queryTaskTag: taskTag, tasks, taskTags, user });
    }

    async recruitStudent(req: Route.Request, res: Route.Response) {
        var user = req.session.user;
        var authUrl = await this.service.wechat.getAuthorizeURL({ parent: req.session.user._id.toString() });

        console.log(`authUrl:` + authUrl);
        await res.render('share/recruit-student', {
            authUrl,
            user
        });
    }


    /**个人中心 */
    async  personCenter(req: Route.Request, res: Route.Response) {
        let user = req.session.user;
        user = await this.service.db.userModel.findById(user._id.toString()).exec();

        console.log(user);
        res.render('share/person-center', {
            user
        });
    }


    /**完善信息页面 */

    fullInfoPage(req: Route.Request, res: Route.Response) {
        res.render('share/full-info')
    }

    /**
     * 
     * 提交表单
     */
    async fixFullInfo(req, res) {
        let { qq, phone, weixinId } = req.body
        await this.service.db.userModel.findById(req.session.user._id.toString()).update({ qq, phone, weixinId, isFinish: true }).exec();
        res.redirect('/share/person-center')
    }

    async  publishPage(req: Route.Request, res: Route.Response) {
        let taskTags = await this.service.db.taskTagModel.find().exec();
        res.render('share/publish', { taskTags })
    }
    /**商户中心 */
    async  shopCenter(req: Route.Request, res: Route.Response) {

        var tasks = await this.service.db.taskModel.find({ publisher: req.session.user._id.toString() }).exec();
        let activeNum = tasks.filter(task => task.active).length;
        var totalClickNum = 0;
        var totalFee = 0;
        tasks.forEach(task => {
            totalClickNum += task.clickNum || 0;
            totalFee += task.totalMoney || 0;
        }
        );
        res.render('share/shop-center', {
            user: req.session.user,
            allTaskNum: tasks.length,
            activeNum,
            totalClickNum,
            totalFee
        })
    }
    /**
     * 检查openid是否存在,若用户已经存在,则登陆,若用户不存在,则创建新用户
     * 若有上级parentId存在则作为用户的师傅
     */
    checkOpenIdExisit(req: Route.Request, res: Route.Response) {

    }
    async   publishTask(req: Route.Request, res: Route.Response) {
        let { title, content, imageUrl, taskTag, shareMoney, totalMoney, websiteUrl } = req.body;
        let newTask = await new this.service.db.taskModel({
            title, taskTag,
            content, imageUrl, totalMoney,
            fee: totalMoney, shareMoney, websiteUrl,
            publisher: this.req.session.user._id.toString(), active: true, msg: '审核通过'
        }).save();
        res.redirect('/share/index');
    }

    async  payTaskMoney(req: Route.Request, res: Route.Response) {
        let ip = this.service.tools.pureIp(this.req.ip);
        var order: WeixinOrder = {
            body: '支付活动费用',
            spbill_create_ip: ip,
            openid: this.req.session.user.openid,
            trade_type: 'JSAPI',
            total_fee: req.body.totalMoney * 100,
            attach: '任务费用',
            out_trade_no: 'kfc' + (+new Date),
        };
        var payargs = await this.service.wechat.wechatPay(order);
        if (payargs) {
            order.user = this.req.session.user._id.toString();
            let newRechgaregeRecord = await new this.db.wxRechargeRecordModel(order).save();
            res.json({ ok: true, data: payargs });

        } else {
            res.json({ ok: false, data: '微信支付失败,查找系统 shareRoute  payTaskMoney 错误' })
        }


    }

    /**
     * 三级分销
     * 
     */
    async  taskDetail(req: Route.Request, res: Route.Response) {
        var taskId = req.query.taskId;
        var shareUserId = req.query.shareUserId;
        // 如果是
        var user = req.session.user;
        // 若不是注册的用户 , 则跳转到登陆页面, 并转载parent,taskId, 该用户会自动注册,拜师,然后返回这个任务做任务
        if (!user) {
            var url = await this.service.wechat.getAuthorizeURL({ parent: shareUserId, taskId: req.params._id })
            res.redirect(url);

        } else {
            var params = await this.service.wechat.getJSSDKApiParams({ url: 'http://' + req.hostname + req.originalUrl });
            var userId = req.session.user._id.toString();
            let task = await this.service.db.taskModel.findById(taskId).exec();

            // let user = await service.db.userModel.findById(userId).populate('parent').exec();;
            var isHaveVisited = task.users.some(visitedUser => {
                return user._id.toString() == visitedUser;
            });
            // 新的观看的人 
            if (!isHaveVisited) {
                console.log('新的观看的人');
                // 任务算新点击一次
                await task.update({ $inc: { clickNum: 1 } }).exec();

                user = await this.service.db.userModel.findById(req.session.user._id.toString()).exec();
                // 任务 增加点击数量,ip访问数量,任务消耗数量, 
                /**
                 * 
                 * 
                 * 钱不够的情况下,不会有任何奖励,并且取消任务的活跃状态
                 */
                if (task.totalMoney - task.shareMoney < 0) {
                    await task.update({ $set: { active: false } }).exec();
                    console.log('钱不够');
                } else {
                    console.log('任务被点击一次');
                    task.update({ $inc: { clickNum: 1 }, $push: { users: user._id.toString() }, $set: { totalMoney: task.totalMoney - task.shareMoney } }).exec();
                    //发布任务的人获得奖金 上级 5%   上上级 10% 上上上级 15%
                    var taskAllMoney = task.shareMoney;
                    if (user) {
                        //
                        console.log('有用户');
                        var parents = [];
                        /**
                         * 有师傅
                         */
                        if (user.parent) {
                            // 有师傅
                            user.populate('parent').execPopulate();
                            console.log('第一位师傅id:', user.parent);
                            parents.push(user.parent);
                            if (user.parent.parent) {
                                parents.push(user.parent.parent);
                                await user.parent.populate('parent').execPopulate();
                                console.log('第二级师傅id:', user.parent.parent)
                                if (user.parent.parent.parent) {
                                    console.log('第三为师傅id:', user.parent.parent);
                                    parents.push(user.parent.parent.parent);
                                }
                            }
                        }
                        console.log(parents.length + '位师傅');
                        switch (parents.length) {
                            // 一个师傅都没有
                            case 0:
                                console.log('一个师傅都没有');
                                // await user.update({ $inc: { totalMoney: taskAllMoney, todayMoney: taskAllMoney, historyMoney: taskAllMoney } }).exec();
                                await this.service.dbDo.returnMoney([{ userId: req.session.user._id.toString(), money: taskAllMoney, task: taskId }], task.shareMoney);
                                break;
                            case 1: //5%
                                console.log('一位师傅开始返利');
                                let firstParent = parents[0];
                                //第一个人
                                let firstMoney = taskAllMoney * 0.05;
                                // 余额
                                taskAllMoney = taskAllMoney * 0.95;
                                // 
                                await this.service.db.userModel.findById(firstParent).update({ $inc: { totalMoney: firstMoney, todayMoney: firstMoney, historyMoney: firstMoney } }).exec();
                                // await user.update({ $inc: { todayMoney: taskAllMoney, totalMoneyMoney: taskAllMoney, historyMoney: taskAllMoney } }).exec();
                                await this.service.dbDo.returnMoney([
                                    { userId: userId, money: taskAllMoney, task: taskId },
                                    { userId: firstParent, money: firstMoney, task: taskId }
                                ], task.shareMoney);
                                break
                            //两个师傅  5% 10%     本人 85%
                            case 2:
                                let oneParent = parents[0];
                                let twoParent = parents[1];
                                let oneMoney = 0.05 * taskAllMoney;
                                let twoMoney = 0.10 * taskAllMoney;
                                // 余额
                                taskAllMoney *= 0.85;
                                // await service.db.userModel.findByIdAndUpdate(oneParent._id.toString(), { $inc: { totalMoney: oneMoney, todayMoney: oneMoney, historyMoney: oneMoney } }).exec();
                                // await service.db.userModel.findByIdAndUpdate(twoParent._id.toString(), { $inc: { totalMoney: twoMoney, todayMoney: twoMoney, historyMoney: twoMoney } }).exec();
                                // await user.update({ $inc: { totalMoney: taskAllMoney, todayMoney: taskAllMoney, historyMoney: taskAllMoney } }).exec();
                                await this.service.dbDo.returnMoney([
                                    { money: taskAllMoney, task: taskId, userId: userId },
                                    { money: oneMoney, task: taskId, userId: oneParent },
                                    { money: twoMoney, task: taskId, userId: twoParent },

                                ], task.shareMoney)
                                break;
                            case 3:
                                let iParent = parents[0];
                                let iiParent = parents[1];
                                let iiiParent = parents[2];
                                let iMoney = 0.05 * taskAllMoney;
                                let iiMoney = 0.10 * taskAllMoney;
                                let iiiMoney = 0.15 * taskAllMoney;
                                // 余额
                                taskAllMoney *= 0.70;
                                // await service.db.userModel.findByIdAndUpdate(iParent._id.toString(), { $inc: { totalMoney: iMoney, todayMoney: iMoney, historyMoney: iMoney } }).exec();
                                // await service.db.userModel.findByIdAndUpdate(iiParent._id.toString(), { $inc: { totalMoney: iiMoney, todayMoney: iiMoney, historyMoney: iiMoney } }).exec();
                                // await service.db.userModel.findByIdAndUpdate(iiiParent._id.toString(), { $inc: { totalMoney: iiiMoney, todayMoney: iiiMoney, historyMoney: iiiMoney } }).exec();
                                // await service.db.userModel.findByIdAndUpdate(user._id.toString(), { $inc: { totalMoney: taskAllMoney, todayMoney: taskAllMoney, historyMoney: taskAllMoney } }).exec();
                                await this.service.dbDo.returnMoney([
                                    { task: taskId, userId, money: taskAllMoney },
                                    { task: taskId, userId: iParent, money: iMoney },
                                    { task: taskId, userId: iiParent, money: iiMoney },
                                    { task: taskId, userId: iiiParent, money: iiiMoney }
                                ], task.shareMoney)
                                break;
                            // 三个师傅 
                        }
                    }
                }


            } else {
                console.log('已经访问过了')
            }
            /**
             * 若有推广人
             */
            await res.render('share/detail', { task, params });
        }
    }
    studentMoney(req: Route.Request, res: Route.Response) {
        var user = req.session.user;
        res.render('share/student-money', {
            user
        });
    }
    async myMoney(req: Route.Request, res: Route.Response) {
        res.render('share/myMoney', {});
    }
    /**
     * 
     * 
     * 提现 
     */
    async    getMoney(req: Route.Request, res: Route.Response) {
        res.render('share/getMoney', { user: req.session.user });
    }

    async  getMoneyDo() {
        let { money, alipay, alipayName } = this.req.body;
        let userId = this.req.session.user._id.toString();
        let user = await this.db.userModel.findById(userId).exec();
        if (user.totalMoney > money && alipay && alipayName) {
            // 请求,钱就会减少
            let newRequest = await new this.db.getMoneyRequestModel({ user: userId, money, alipay, alipayName }).save();

            let action = await this.db.userModel.findByIdAndUpdate(userId, { $inc: { totalMoney: -money, } }).exec();
            this.req.session.user = this.res.locals.user = await this.db.userModel.findById(userId).exec();
            this.render('getMoney', { successMsg: '进入审核状态' })


        } else {
            this.render('getMoney', { errorMsg: '金额不足' });

        }



        // let ip = this.service.tools.pureIp(this.req.ip);
        /* var payargs = await this.service.wechat.wechatReturnMoney({
             attach: '用户体现',
             spbill_create_ip: ip,
             out_trade_no: '' + new Date().getTime(),
             trade_type: 'JSAPI',
             openid: this.req.session.user.openid, body: '用户体现', total_fee: money
         });
 */



    }
    async　guide(req: Route.Request, res: Route.Response) {
        res.render('share/guide', {})
    }
    async　taskList(req: Route.Request, res: Route.Response) {
        var active = !req.query.active;
        let tasks = [];
        if (active) {
            tasks = await this.service.db.taskModel.find({ publisher: req.session.user._id.toString() }).exec();
        } else {
            tasks = await this.service.db.taskModel.find({ publisher: req.session.user._id.toString(), active: true }).exec();
        }
        res.render('share/task-list', { tasks });
    }
    /**钱的记录 */
    async getMoneyRecord(req: Route.Request, res: Route.Response) {
        let getMoneyRecords = await this.db.getMoneyRequestModel.find({ user: this.req.session.user._id }).exec();

        this.render('get-money-record', { user: req.session.user, getMoneyRecords });
    }
    async fansMoney(req: Route.Request, res: Route.Response) {
        let now = new Date().getTime();
        let before24h = now - 24 * 60 * 60 * 1000;
        let taskRecords = await this.db.taskRecordModel
            .find({ 'shareDetail.user': { $in: [this.req.session.user._id.toString()] } })
            .where('createDt').gt(before24h).lt(now).sort({ createDt: -1 }).populate('task').exec();

        /** 总收益 */
        let allMoney = 0;
        // 本身收益 
        let allMyMoney = 0;
        // 1级收益
        let level1 = {
            num: 0,
            money: 0
        };
        let level2 = {
            num: 0,
            money: 0
        };
        let level3 = {
            num: 0,
            money: 0
        };


        taskRecords.forEach(taskRecord => {
            let order = taskRecord.shareDetail.find(order => order.user == this.req.session.user._id);
            allMyMoney += taskRecord.shareDetail[0].user == this.req.session.user._id ? taskRecord.shareDetail[0].money : 0;
            let index = taskRecord.shareDetail.indexOf(order);
            //
            switch (index) {
                case 0:
                    break;
                case 1:
                    level1.money += taskRecord.shareDetail[0].money;
                    level1.num++;
                    break;
                case 2:
                    level1.money += taskRecord.shareDetail[0].money;
                    level2.money += taskRecord.shareDetail[1].money;
                    level1.num++;
                    level2.num++;
                    break;
                case 3:
                    level1.money += taskRecord.shareDetail[0].money;
                    level2.money += taskRecord.shareDetail[1].money;
                    level3.money += taskRecord.shareDetail[2].money;

                    level1.num++;
                    level2.num++;
                    level3.num++;
                    break;
            }
            allMoney += order.money;
        });




        res.render('share/fans-money', {
            user: req.session.user,
            allMoney, allMyMoney,
            level1,
            level2,
            level3


        })
    }
    async moneyLog(req: Route.Request, res: Route.Response) {
        let now = new Date().getTime();
        let before24h = now - 24 * 60 * 60 * 1000;
        let taskRecords = await this.db.taskRecordModel
            .find({ 'shareDetail.user': { $in: [this.req.session.user._id.toString()] } })
            .where('createDt').gt(before24h).lt(now).sort({ createDt: -1 }).populate('task').exec();

        res.render('share/money-log', { taskRecords });
    }
}