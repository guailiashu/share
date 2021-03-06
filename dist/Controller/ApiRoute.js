"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const path = require("path");
const fs = require("fs");
let ApiRoute = class ApiRoute extends lib_1.Core.Route.BaseRoute {
    constructor() {
        super();
    }
    doAction(action, method, next) {
        switch (action) {
            case 'uploadBase64':
                return this.uploadBase64;
        }
    }
    before() { this.next(); }
    after() { }
    async uploadBase64() {
        let base64 = this.req.body.base64;
        var ctrl = this;
        function uploadFile(file, filename) {
            return new Promise((resolve, reject) => {
                if (file.indexOf('base64,') != -1) {
                    file = file.substring(file.indexOf('base64,') + 7);
                }
                let randomFilename = new Date().getTime() + filename;
                let distpath = path.resolve(ctrl.service.CONFIG.uploadDir + '/' + randomFilename);
                fs.writeFile(distpath, new Buffer(file, 'base64'), (err) => {
                    err ? resolve(false) : resolve('/upload/' + randomFilename);
                });
            });
        }
        let url = await uploadFile(base64, this.req.body.filename || 'test.png');
        console.log('上传图片:' + url);
        this.res.json({ ok: true, data: this.service.CONFIG.IP + url });
    }
    /**
     *
     * @param req
     * @param res
     * @param next
     */
    async getList(req, res, next) {
        var model;
        model = this.service.db[req.params.modelName + 'Model'];
        if (model) {
            let datas = await model.find().exec();
            res.json({
                ok: true,
                data: datas
            });
        }
        else {
            res.json({
                ok: false,
                data: '数据模型不存在'
            });
        }
    }
    async getDetail(req, res, next) {
        var model;
        model = this.service.db[req.params.modelName + 'Model'];
        if (model) {
            let data = await model.findById(req.params._id).exec();
            res.json({
                ok: true,
                data: data
            });
        }
        else {
            res.json({ ok: false, data: '该数据模型不存在' });
        }
    }
    /**
     * 添加一条数据
     * method post
     *  /:modelName
     */
    async postOne(req, res, next) {
        var model;
        model = this.service.db[req.params.modelName + 'Model'];
        if (model) {
            let newData = await new model(req.body).save();
            res.json({
                ok: true,
                data: newData
            });
        }
        else {
            res.json({ ok: true, data: '该数据模型不存在' });
        }
    }
    /**
     * 删除一条数据
     * /:modelName/:_id
     */
    async deleteOne(req, res, next) {
        var model;
        model = this.service.db[req.params.modelName + 'Model'];
        if (model) {
            let action = model.findByIdAndRemove(req.params._id).exec();
            res.json({
                ok: true,
                data: action
            });
        }
        else {
            res.json({
                ok: false,
                data: '数据模型不存在'
            });
        }
    }
};
ApiRoute = __decorate([
    lib_1.Core.Route.Controller({
        service: 'api',
        viewPath: 'api'
    })
], ApiRoute);
exports.default = ApiRoute;
