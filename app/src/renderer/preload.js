const { ipcRenderer, clipboard, remote } = require('electron');
const { get: _get } = require('lodash');
const Translator = require('./js/translator');
const RendererRouter = require('./js/rendererRouter');
const constants = require('../common/constants');

function getInitializeList() {
    const preload = {};
    preload.ipcRenderer = ipcRenderer;
    preload.clipboard = clipboard;
    preload.remote = remote;
    preload.RendererRouter = RendererRouter;
    preload.constants = constants;

    const translator = new Translator();
    const lang = translator.currentLangauge;
    preload.Lang = require(`./lang/${lang}.js`).Lang;
    preload.translator = translator;


    preload.platform = process.platform;
    preload.os = `${process.platform}-${(() => (
        process.arch === 'x64' ||
        process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')
    ))() ? 'x64' : process.arch}`;

    return preload;
}

// TODO Lang 에 있는 하드웨어 관련 템플릿 전부 translator 로 처리
(function() {
    window.preload = getInitializeList();
    window.getLang = (template) => _get(window.preload.Lang, template);
    window.translate = (template) => window.preload.translator.translate(template);
})();
