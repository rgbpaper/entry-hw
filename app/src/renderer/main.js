'use strict';
const {
    ipcRenderer, shell, clipboard, remote, RendererRouter, constants,
    lang, Lang, translator, platform, os,
} = window.preload;
const Modal = window.Modal.default;
const modal = new Modal();

const {
    HARDWARE_STATEMENT: Statement,
    AVAILABLE_TYPE: AvaliableType,
} = constants;
let priorHardwareList = JSON.parse(localStorage.getItem('hardwareList')) || [];

let viewMode = 'main';
const hardwareList = [];


$('html').addClass(platform);

// ui & control
// dropdown setting start
const categoryDropdown = $('#filter_category');
const categoryDropdownOptions = categoryDropdown.children('li:not(.init)');
const categoryDropdownCurrentSelected = categoryDropdown.children('.init');

const hideCategory = () => {
    categoryDropdown.hide();
    categoryDropdownOptions.hide();
};

categoryDropdown.on('click', '.init', () => {
    categoryDropdownCurrentSelected.toggleClass('open');
    categoryDropdownOptions.toggle();
});

categoryDropdown.on('click', 'li:not(.init)', function() {
    categoryDropdownOptions.removeClass('selected');

    const selected = $(this);
    const selectedCategory = selected.data('value');
    selected.addClass('selected');
    categoryDropdownCurrentSelected.html(selected.html());

    categoryDropdownCurrentSelected.append(
        $('<div></div>')
            .addClass('arrow'),
    );

    // 카테고리 닫기
    categoryDropdownCurrentSelected.toggleClass('open');
    categoryDropdownOptions.toggle();

    // 카테고리 목록, 선택 카테고리 데이터 변경
    categoryDropdownCurrentSelected.data('value', selectedCategory);
    filterHardware(selectedCategory);
});

// dropdown setting end

$('.alertMsg .alertMsg1').text(
    translator.translate('If unexpected problem occurs while operating,'),
);
$('.alertMsg .alertMsg2').text(
    translator.translate(
        'contact the hardware company to resolve the problem.',
    ),
);
$('#errorAlert .comment').text(
    translator.translate(
        '* Entry Labs is not responsible for the extension program and hardware products on this site.',
    ),
);

$('#select_port_box .title span').text(translator.translate('Select'));
$('#select_port_box .description').text(
    translator.translate('Select the COM PORT to connect'),
);
$('#select_port_box #btn_select_port_cancel').text(
    translator.translate('Cancel'),
);
$('#select_port_box #btn_select_port').text(
    translator.translate('Connect'),
);

$('#reference .emailTitle').text(translator.translate('E-Mail : '));
$('#reference .urlTitle').text(translator.translate('WebSite : '));
$('#reference .videoTitle').text(translator.translate('Video : '));

const $openSourceLabel = $('#opensource_label');
$openSourceLabel.text(translator.translate('Opensource lincense'));
$openSourceLabel.on('click', () => {
    $('#opensource_license_viewer').css('display', 'flex');
});
$('#opensource_license_viewer .title span').text(
    translator.translate('Opensource lincense'),
);
$('#opensource_license_viewer #btn_close').text(
    translator.translate('Close'),
);

const $versionLabel = $('#version_label');
$versionLabel.text(translator.translate('Version Info'));
$versionLabel.on('click', () => {
    ipcRenderer.send('openAboutWindow');
});

$('#firmware').text(translator.translate('Install Firmware'));
$('#other-robot .text').text(
    translator.translate('Connect Other Hardware'),
);
$('#entry .text').text(translator.translate('Show Entry Web Page'));

$('#driverButtonSet').on('click', 'button', function() {
    router.executeDriverFile(this.driverPath);
});

$('#firmwareButtonSet').on('click', 'button', function() {
    // 여기서의 this 는 $dom 의 props 이다. arrow function 금지
    ui.flashFirmware(this.firmware);
});

const ui = {
    cachedPortList: [],
    countRobot: 0,
    showModal(message, title = '', styleOptions = {}, onclickCallback) {
        modal.alert(message, title, styleOptions).one('click', onclickCallback);
    },
    showRobotList() {
        viewMode = 'main';
        $('#alert')
            .stop()
            .clearQueue();
        currentState = 'disconnected';
        router.close();
        router.stopScan();
        delete window.currentConfig;
        $('#title').text(translator.translate('Select hardware'));
        categoryDropdown.show();
        $('#hwList').show();
        $('#search_area').show();
        $('#hwPanel').css('display', 'none');
        ui.showIeGuide();
        this.hideAlert();
        $('#back.navigate_button').removeClass('active');
    },
    showConnecting() {
        $('#title').text(translator.translate('hardware > connecting'));
        hideCategory();
        $('#hwList').hide();
        $('#search_area').hide();
        $('#hwPanel').css('display', 'flex');
        $('#back.navigate_button').addClass('active');
        ui.hideIeGuide();
        this.showAlert(
            translator.translate('Connecting to hardware device.'),
        );
    },
    showConnected() {
        $('#title').text(translator.translate('hardware > connected'));
        hideCategory();
        $('#hwList').hide();
        $('#search_area').hide();
        $('#hwPanel').css('display', 'flex');
        $('#back.navigate_button').addClass('active');
        ui.hideIeGuide();
        this.showAlert(
            translator.translate('Connected to hardware device.'),
            2000,
        );
    },
    showDisconnected() {
        $('#title').text(translator.translate('hardware > disconnected'));
        hideCategory();
        $('#hwList').hide();
        $('#search_area').hide();
        $('#hwPanel').css('display', 'flex');
        ui.hideIeGuide();
        this.showAlert(
            translator.translate(
                'Hardware device is disconnected. Please restart this program.',
            ),
        );
    },
    showAlert(message, duration) {
        if (!$('#hwList').is(':visible')) {
            const $alert = $('#alert');
            $alert.removeClass('error');
            $alert.text(message);
            $alert.css({ height: '0px' });
            $alert
                .stop()
                .animate({ height: '35px' });
            if (duration) {
                setTimeout(() => {
                    $alert
                        .stop()
                        .animate({ height: '0px' });
                }, duration);
            }
        }
    },
    showError(message, duration) {
        if (!$('#hwList').is(':visible')) {
            $('#alert').addClass('error');
            $('#alert').text(message);

            $('#alert').css({
                height: '0px',
            });
            $('#alert')
                .stop()
                .animate({
                    height: '35px',
                });
            if (duration) {
                setTimeout(() => {
                    $('#alert')
                        .stop()
                        .animate({
                            height: '0px',
                        });
                }, duration);
            }
        }
    },
    hideAlert() {
        $('#alert')
            .stop(true, true)
            .animate({
                height: '0px',
            });
    },
    hideRobot(id) {
        $(`#${id}`).hide();
    },
    clearRobot() {
        $('#hwList').empty();
    },
    showRobot(hardware) {
        if (hardware.id) {
            $(`#${hardware.id}`).show();
            viewMode = this.id;
            // $('#back.navigate_button').addClass('active');

            isSelectPort = hardware.select_com_port ||
                hardware.hardware.type === 'bluetooth' ||
                serverMode === 1 ||
                false;

            const newSelectList = priorHardwareList
                .filter((item) => item !== hardware.name.ko);

            newSelectList.push(hardware.name.ko);
            localStorage.setItem(
                'hardwareList',
                JSON.stringify(newSelectList),
            );
            priorHardwareList = newSelectList;

            const icon = `../../../modules/${hardware.icon}`;
            $('#selectedHWThumb').attr('src', icon);

            if (hardware.url) {
                const $url = $('#url');
                $url.text(hardware.url);
                $('#urlArea').show();
                $url.off('click');
                $url.on('click', () => {
                    shell.openExternal(hardware.url);
                });
            } else {
                $('#urlArea').hide();
            }

            if (hardware.video) {
                let video = hardware.video;
                const $video = $('#video');

                if (typeof video === 'string') {
                    video = [video];
                }

                $video.empty();
                video.forEach((link, idx) => {
                    $video.append(`<span>${link}</span><br/>`);
                    $('#videoArea').show();
                });
                $video.off('click');
                $video.on('click', 'span', (e) => {
                    const index = $('#video span').index(e.target);
                    console.log(video, index, video[index]);
                    shell.openExternal(video[index]);
                });
            } else {
                $('#videoArea').hide();
            }

            if (hardware.email) {
                const $email = $('#email');
                $email.text(hardware.email);
                $('#emailArea').show();
                $email
                    .off('click')
                    .on('click', () => {
                        clipboard.writeText(hardware.email);
                        alert(
                            translator.translate('Copied to clipboard'),
                        );
                    });
            } else {
                $('#emailArea').hide();
            }

            $('#driverButtonSet button').remove();
            $('#firmwareButtonSet button').remove();

            if (hardware.driver) {
                if (
                    $.isPlainObject(hardware.driver) &&
                    hardware.driver[os]
                ) {
                    const $dom = $('<button class="hwPanelBtn">');
                    $dom.text(
                        translator.translate('Install Device Driver'),
                    );
                    $dom.prop('driverPath', hardware.driver[os]);
                    $('#driverButtonSet').append($dom);
                } else if (Array.isArray(hardware.driver)) {
                    hardware.driver.forEach((driver) => {
                        if (driver[os]) {
                            const $dom = $('<button class="hwPanelBtn">');
                            $dom.text(
                                translator.translate(driver.translate),
                            );
                            $dom.prop('driverPath', driver[os]);
                            $('#driverButtonSet').append($dom);
                        }
                    });
                }
            }
            if (hardware.firmware) {
                $('#firmware').show();
                if (Array.isArray(hardware.firmware)) {
                    hardware.firmware.forEach((firmware) => {
                        const $dom = $('<button class="hwPanelBtn">');
                        $dom.text(
                            translator.translate(firmware.translate),
                        );
                        $dom.prop('firmware', firmware.name);
                        $dom.prop('config', hardware);
                        $('#firmwareButtonSet').append($dom);
                    });
                } else {
                    const $dom = $('<button class="hwPanelBtn">');
                    $dom.text(translator.translate('Install Firmware'));
                    $dom.prop('firmware', hardware.firmware);
                    $dom.prop('config', hardware);
                    $('#firmwareButtonSet').append($dom);
                }
            }

            ui.hardware = hardware.id.substring(0, 4);
            ui.numLevel = 1;
            ui.showConnecting();
            hardware.serverMode = serverMode;
            window.currentConfig = hardware;
        } else {
            $('.hardwareType').show();
        }
    },
    addRobot(config) {
        ui.showRobotList();

        switch (config.availableType) {
            case AvaliableType.available: {
                $('#hwList').append(`
                <div class="hardwareType" id="${config.id}">
                    <img class="hwThumb" src="../../../modules/${config.icon}" alt="">
                    <h2 class="hwTitle">
                        ${config.name && config.name[lang] || config.name.en}
                    </h2>
                </div>
            `);

                $(`#${config.id}`)
                    .off('click')
                    .on('click', () => {
                        ui.showRobot(config);
                        router.startScan(config);
                    });
                break;
            }
            case AvaliableType.needDownload: {
                $('#hwList').append(`
                <div class="hardwareType"
                id="${config.id}"
                style="filter: grayscale(100%); opacity: 0.5">
                    <img class="hwThumb" src="${config.image}" alt="">
                    <h2 class="hwTitle">
                        ${config.name && config.name[lang] || config.name.en || config.name}
                    </h2>
                </div>
            `);
                $(`#${config.id}`)
                    .off('click')
                    .on('click', () => {
                        router.requestDownloadModule(config);
                        // ui.showRobot(config);
                        // router.startScan(config);
                    });
                break;
            }
            case AvaliableType.needUpdate: {
                $('#hwList').append(`
                <div class="hardwareType" id="${config.id}">
                    <img class="hwThumb" src="../../../modules/${config.icon}" alt="">
                    <h2 class="hwTitle">
                        [업]${config.name && config.name[lang] || config.name.en}
                    </h2>
                </div>
            `);

                $(`#${config.id}`)
                    .off('click')
                    .on('click', () => {
                        ui.showRobot(config);
                        router.startScan(config);
                    });
                break;
            }
        }
    },
    flashFirmware(firmwareName) {
        if (currentState !== 'before_connect' && currentState !== 'connected') {
            alert(
                translator.translate('Hardware Device Is Not Connected'),
            );
            ui.showConnecting();
            $('#firmwareButtonSet').show();
            return;
        }

        $('#firmwareButtonSet').hide();
        ui.showAlert(translator.translate('Firmware Uploading...'));
        router.requestFlash(firmwareName)
            .then(() => {
                ui.showAlert(
                    translator.translate('Firmware Uploaded!'),
                );
            })
            .catch((e) => {
                console.error(e);
                ui.showAlert(
                    translator.translate(
                        'Failed Firmware Upload',
                    ),
                );
            })
            .finally(() => {
                $('#firmwareButtonSet').show();
            });
    },
    showPortSelectView(portList) {
        if (
            JSON.stringify(portList) !== this.cachedPortList &&
            isSelectPort &&
            viewMode !== 'main'
        ) {
            let portHtml = '';
            portList.forEach((port) => {
                portHtml +=
                    `<option title="${port.comName}">${port.comName}</option>`;
            });

            $('#select_port_box select').html(portHtml);
            this.cachedPortList = JSON.stringify(portList);
        }
        $('#select_port_box').css('display', 'flex');
    },
    quit() {
    },
    showIeGuide() {
        $('#errorAlert').show();
    },
    hideIeGuide() {
        $('#errorAlert').hide();
    },
};
const router = new RendererRouter(ui);
window.router = router;

$('#search_bar').on('keydown', function(e) {
    if (e.which === 27) {
        this.value = '';
        searchHardware('');
    } else if (e.which === 13) {
        searchHardware(this.value);
    }

    if (this.value) {
        $('#search_close_button').show();
    } else {
        $('#search_close_button').hide();
    }
});

$('#search_button').on('click', () => {
    searchHardware($('#search_bar').val());
});

$('#search_close_button').on('click', function() {
    $('#search_bar').val('');
    $(this).hide();
    filterHardware(categoryDropdownCurrentSelected.data('value'));
});

function searchHardware(searchText) {
    // var searchText = $('#search_bar').val();
    const currentCategory = $('#filter_category').children('.init').data('value');
    let isNotFound = true;
    if (searchText) {
        const hideList = hardwareList.filter((hardware) => {
            const en = hardware.name.en.toLowerCase();
            const ko = hardware.name.ko.toLowerCase();
            const text = searchText.toLowerCase();
            if (
                (ko.indexOf(text) > -1 || en.indexOf(text) > -1) && // 검색결과가 있는지
                (hardware.platform.indexOf(process.platform) > -1) && // 현재 플랫폼과 동일한지
                (currentCategory === 'all' || hardware.category === currentCategory) // 현재 카테고리에 포함되었는지
            ) {
                ui.showRobot(hardware);
                isNotFound = false;
            } else {
                return true;
            }
        });

        if (isNotFound) {
            alert(translator.translate('No results found'));
        } else {
            hideList.forEach((hardware) => {
                ui.hideRobot(hardware.id);
            });
        }
    } else {
        ui.showRobot();
    }
}

/**
 * 카테고리 별로 데이터를 표시한다.
 * 카테고리 변경시 검색결과는 삭제된다.
 * @param type{string} all|robot|module|board
 */
function filterHardware(type) {
    $('#search_bar').val('');
    $('#search_close_button').hide();
    if (!type || type === 'all') {
        ui.showRobot();
    } else {
        hardwareList.forEach((hardware) => {
            if (hardware.category === type) {
                ui.showRobot(hardware);
            } else {
                ui.hideRobot(hardware.id);
            }
        });
    }
}

const $body = $('body');
$body.on('keyup', (e) => {
    if (e.keyCode === 8) {
        $('#back.navigate_button.active').trigger('click');
    }
});

$body.on('click', '#back.navigate_button.active', (e) => {
    isSelectPort = true;
    window.currentConfig && delete window.currentConfig.this_com_port;
    ui.showRobotList();
});

$body.on('click', '#refresh', (e) => {
    if (
        confirm(translator.translate('Do you want to restart the program?'))
    ) {
        ipcRenderer.send('reload');
    }
});

$('.chromeButton').on('click', (e) => {
    shell.openExternal(
        'https://www.google.com/chrome/browser/desktop/index.html',
    );
});

ipcRenderer.on('hardwareCloseConfirm', () => {
    let isQuit = true;
    if (currentState === 'connected') {
        isQuit = confirm(
            translator.translate(
                'Connection to the hardware will terminate once program is closed.',
            ),
        );
    }

    if (isQuit) {
        router.close();
        ipcRenderer.send('hardwareForceClose', true);
    }
});

$('#select_port').dblclick(() => {
    $('#btn_select_port').trigger('click');
});

$('#btn_select_port').click((e) => {
    const com_port = $('#select_port').val();
    if (!com_port) {
        alert(translator.translate('Select the COM PORT to connect'));
    } else {
        window.currentConfig.this_com_port = com_port[0];
        clearSelectPort();
    }
});

$('#select_port_box .cancel_event').click((e) => {
    clearSelectPort();
    ui.cachedPortList = '';
    clearTimeout(selectPortConnectionTimeout);
});

function clearSelectPort() {
    isSelectPort = false;
    $('#select_port_box').css('display', 'none');
}

$('#opensource_license_viewer .close_event').on('click', () => {
    $('#opensource_license_viewer').css('display', 'none');
});


router.getOpensourceContents().then((text) => {
    $('#opensource_content').val(text);
});

var isSelectPort = true;
let selectPortConnectionTimeout;
var serverMode = 0;
// state

const initialServerMode = ipcRenderer.sendSync('getCurrentServerModeSync');
serverMode = initialServerMode;
if (initialServerMode === 1) {
    console.log('%cI`M CLIENT', 'background:black;color:yellow;font-size: 30px');
    $('#cloud_icon').show();
} else {
    console.log('%cI`M SERVER', 'background:orange; font-size: 30px');
    $('#cloud_icon').hide();
}
ipcRenderer.on('serverMode', (event, mode) => {
    if (serverMode === mode && mode === 1) {
        console.log('%cI`M SERVER', 'background:orange; font-size: 30px');
    }

    serverMode = mode;
    if (mode === 1) {
        $('#cloud_icon').show();
    } else {
        $('#cloud_icon').hide();
    }
});

let currentState = '';
ipcRenderer.on('state', (event, state, data) => {
    console.log(state);
    const {
        showRobot,
        lost,
        disconnected,
        selectPort,
        flash,
        beforeConnect,
        connected,
    } = Statement;

    // select_port 는 기록해두어도 쓸모가 없으므로 표기하지 않는다
    if (state !== selectPort) {
        currentState = state;
    }

    switch (state) {
        case showRobot: {
            ui.showRobot(data);
            break;
        }
        case selectPort: {
            router.close();
            ui.showPortSelectView(data);
            if (isSelectPort) {
                selectPortConnectionTimeout = setTimeout(() => {
                    if (viewMode !== 'main') {
                        router.startScan(window.currentConfig);
                    }
                }, 1000);
            } else {
                isSelectPort = true;
            }
            return; // ui 변경 이루어지지 않음.
        }
        case flash: {
            ui.flashFirmware();
            break;
        }
        case beforeConnect: {
            ui.showAlert(
                `${translator.translate('Connecting to hardware device.')
                    } ${
                    translator.translate('Please select the firmware.')}`,
            );
            break;
        }
        case lost:
            ui.showConnecting();
            break;
        case disconnected:
            ui.showDisconnected();
            break;
        case connected:
            ui.showConnected();
            break;
    }
});

// configuration
router.refreshHardwareModules();
