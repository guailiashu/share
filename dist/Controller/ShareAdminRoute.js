"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
let ShareAdminRoute = class ShareAdminRoute extends lib_1.Core.Route.BaseRoute {
    doAction(action, method, next) {
        switch (action) {
            case 'user-list': return this.userList; //分页
            //case 'user': return this.user;//用户页，删除 
            case 'user': switch (method) {
                case 'get': return this.getUser; //用户支付
                case 'post': return this.taskTagNew;
                case 'put': return this.putUser; //编辑 
                default: return this.user;
            }
            case 'user-search': return this.getaUaerSearch; //搜索
            case 'main-info': return this.mainInfo;
            case 'index': return this.index;
            case 'task-delete': return this.taskDelete;
            case 'task-edit': return this.taskEdit;
            case 'taskTag-list': return this.taskTagList; //栏目信息
            case 'taskTag':
                switch (method) {
                    case 'get': return this.taskTagDetail;
                    case 'post': return this.taskTagNew;
                    case 'put': return this.taskTagUpdate;
                    default: return this.taskTagDelete; //删除
                }
                ;
            case 'taskRecord-edit': return this.taskRecordEdit;
            case 'task-list': return this.taskList;
            case 'task-by-taskTag': return this.taskBytaskTag;
            case 'task': return this.updateTask; //put请求
            case 'recharegeRecord-delete': return this.recharegeRecordId; //delete请求
            default: return this.index;
        }
    }
    async getaUaerSearch() {
        let keyword = this.req.query.keyword;
        let searchUser = await this.db.userModel.find({ nickname: new RegExp(keyword, 'g') }).exec(); //运用正则
        this.res.json({
            ok: true,
            data: searchUser
        });
    }
    async getUser() {
        //5979aa66f97b400ef876681d
        let _id = this.req.query._id;
        let user = await this.db.userModel.findById(_id).exec(); //返回数据     
        let tasks = await this.db.taskModel.find({ publisher: user._id.toString() }).exec(); //子栏目
        let getMoneyRequests = await this.db.getMoneyRequestModel.find({ user: _id }).populate('user').exec();
        let tree = {
            level1Parent: null,
            level2Parent: null,
            level3Parent: null,
            level1Children: [],
            level2Children: [],
            level3Children: [],
        };
        //查上三级
        if (user.parent) {
            await user.populate('parent').execPopulate();
            tree.level1Parent = user.parent;
            if (user.parent.parent) {
                await user.parent.populate('parent').execPopulate();
                ;
                tree.level2Parent = user.parent.parent;
                if (user.parent.parent.parent) {
                    await user.parent.parent.populate('parent').execPopulate();
                    ;
                    tree.level3Parent = user.parent.parent.parent;
                }
            }
        }
        // 查下三级
        tree.level1Children = await this.db.userModel.find({ parent: _id }).exec();
        if (tree.level1Children.length > 0) {
            let childrenIds = tree.level1Children.map(child => child._id.toString());
            tree.level2Children = await this.db.userModel.find({ parent: { $in: childrenIds } }).exec();
            childrenIds = tree.level2Children.map(child => child._id.toString());
            tree.level3Children = await this.db.userModel.find({ parent: { $in: childrenIds } }).exec();
        }
        this.res.json({
            ok: true,
            data: {
                user,
                tasks,
                getMoneyRequests,
                tree
            }
        });
    }
    async putUser() {
        let _id = this.req.query._id;
        let modifyUser = await this.db.userModel.findByIdAndUpdate(_id, this.req.body).exec();
        this.res.json({
            ok: true,
            data: modifyUser
        });
    }
    async user() {
        let _id = this.req.query._id;
        let deleteUser = await this.db.userModel.findByIdAndRemove(_id).exec();
        this.res.json({
            ok: true,
            data: deleteUser,
        });
    }
    async recharegeRecordId() {
        let _id = this.req.query._id;
        let recharege = await this.db.taskRecordModel.findByIdAndRemove(_id).exec();
    }
    async updateTask() {
        let _id = this.req.query._id;
        let modfiyTask = await this.db.taskModel.findByIdAndUpdate(_id, this.req.body).exec();
        this.res.json({
            ok: true,
            data: modfiyTask
        });
    }
    async taskBytaskTag() {
        let { active, taskTag } = this.req.query;
        let tasks = [];
        if (active) {
            tasks = await this.db.taskModel.find({ active, taskTag }).populate('publisher').exec();
        }
        else {
            tasks = await this.db.taskModel.find({ taskTag }).populate('publisher').exec();
        }
        this.res.json({
            ok: true,
            data: tasks,
        });
    }
    async taskTagDetail() {
        let taskTag = await this.db.taskTagModel.findById(this.req.query._id).exec();
        let subTasks = await this.db.taskModel.find({ taskTag: taskTag._id.toString() }).exec(); //子栏目
        if (taskTag) {
            this.res.json({
                ok: true,
                data: {
                    taskTag,
                    subTasks,
                }
            });
        }
        else {
            this.res.json({
                ok: false,
                data: '该栏目不存在,请传入参数正确的id'
            });
        }
    }
    async taskTagNew() {
        let { name, sort } = await this.req.body;
        let newTaskTag = await new this.db.taskTagModel({ name: name, sort: sort }).save();
        this.res.json({
            ok: true,
            data: newTaskTag
        });
    }
    async taskTagUpdate() {
        let _id = await this.req.query._id;
        let updateResult = await this.db.taskTagModel.findByIdAndUpdate(_id, this.req.body).exec();
        this.res.json({
            ok: true,
            data: updateResult
        });
    }
    async taskTagDelete() {
        let taskTag = await this.db.taskTagModel.findById(this.req.query._id).exec();
        let subTaskCount = await this.db.taskModel.find({ taskTag: taskTag._id.toString() }).count().exec(); //子类数量
        if (subTaskCount > 0) {
            this.res.json({
                ok: false,
                data: '请先删除该栏目下的子任务'
            });
        }
        else {
            let deleteAction = await this.db.taskTagModel.findByIdAndRemove(this.req.query._id).exec();
            this.res.json({ ok: true, data: deleteAction });
        }
    }
    async userList() {
        let page = this.req.query.page || 0;
        let users = await this.db.userModel.find().skip(page * 10).limit(10).exec(); //分页
        let count = await this.db.userModel.find().count().exec();
        this.res.json({ ok: true, data: { users, count } });
    }
    async mainInfo() {
        let userCount = await this.db.userModel.find().count().exec();
        let taskTagCount = await this.db.taskTagModel.find().count().exec();
        let activeTaskCount = await this.db.taskModel.find({ active: true }).count().exec();
        let unActiveTaskCount = await this.db.taskModel.find({ active: false }).count().exec();
        this.res.json({
            ok: true,
            data: {
                userCount,
                taskTagCount,
                activeTaskCount,
                unActiveTaskCount,
            }
        });
    }
    async taskList() {
        let tasks = await this.db.taskModel.find(this.req.query).populate('publisher').exec();
        let count = await this.db.taskModel.find().count().exec();
        this.res.json({ ok: true, data: { tasks, count } });
    }
    before() {
        // if (this.req.session.admin || this.req.baseUrl == '/share-admin/login') {
        this.next();
        // } else {
        // this.res.redirect('/share-admin/login')
        // }
    }
    after() { }
    async taskRecordEdit() {
        var taskRecord = await this.service.db.taskRecordModel.findById(this.req.query._id).exec();
        let orders = taskRecord.shareDetail;
        for (let order of orders) {
            let temp = await this.service.db.userModel.findById(order.user).exec();
            order.user = temp;
        }
        var task = await this.service.db.taskModel.findById(taskRecord.task).exec();
        this.res.render('share-admin/taskRecord-edit', { taskRecord, task });
    }
    async taskEdit() {
        var _id = this.req.query._id;
        var task = await this.service.db.taskModel.findById(_id).populate('taskTag').exec();
        var taskTags = await this.service.db.taskTagModel.find().exec();
        //var taskTags = await this.service.db.taskTagModel.find().exec();
        var taskRecords = await this.service.db.taskRecordModel.find({ task: task._id.toString() }).exec();
        console.log(taskRecords);
        this.res.render('share-admin/task-edit', { task, taskRecords, taskTags });
    }
    async taskTagEdit() {
        let { _id, name, sort } = this.req.body;
        await this.service.db.taskTagModel.findByIdAndUpdate(_id, { $set: { name, sort } }).exec();
        this.res.redirect('/share-admin/taskTag-list');
    }
    async taskTagEditPage() {
        let taskTag = await this.service.db.taskTagModel.findById(this.req.query._id).exec();
        let subTasks = await this.service.db.taskModel.find({ taskTag: taskTag._id.toString() }).exec();
        this.res.render('share-admin/taskTag-edit', { taskTag, subTasks });
    }
    login() {
        ``;
        let { username, password } = this.req.body;
        console.log(username, password);
        if (username == 'admin' && password == '123') {
            this.req.session.admin = {
                username,
                password
            };
            this.res.redirect('/share-admin/index');
        }
        else {
            this.res.render('share-admin/login', { errorMsg: '用户名或密码不正确' });
        }
    }
    loginPage() {
        this.res.render('share-admin/login');
    }
    async index() {
        // 任务标签总数
        var taskTagNum = await this.service.db.taskTagModel.find().count().exec();
        // 任务数量
        var taskNum = await this.service.db.taskTagModel.find().count().exec();
        var taskActiveNum = await this.service.db.taskTagModel.find({ active: true }).count().exec();
        var recordNum = await this.service.db.taskRecordModel.find().count().exec();
        this.res.render(`share-admin/index`, { taskTagNum, taskNum, taskActiveNum, recordNum });
    }
    async taskDelete() {
        var _id = this.req.query._id;
        let action = await this.service.db.taskModel.findByIdAndRemove(_id).exec();
        this.res.redirect(`/share-admin/task-list`);
    }
    async taskTagList() {
        var taskTags = await this.db.taskTagModel.find().sort({ sort: -1 }).exec();
        var taskNums = [];
        for (let taskTag of taskTags) {
            taskTag = taskTag._id.toString();
            let taskNum = await this.db.taskModel.find({ taskTag }).count().exec();
            taskNums.push(taskNum);
        }
        //     this.josn('taskTag-list', { taskTags, taskNums });
        // }
        this.res.json({
            ok: true,
            data: {
                taskTags, taskNums
            }
        });
    }
    async taskTagNewPageDo() {
        let { name } = this.req.body;
        let newTaskTag = await new this.service.db.taskTagModel({ name }).save();
        this.res.redirect('/share-admin/taskTag-list');
    }
};
ShareAdminRoute = __decorate([
    lib_1.Core.Route.Controller({
        service: 'share-admin',
        viewPath: 'share-admin'
    })
], ShareAdminRoute);
exports.default = ShareAdminRoute;
