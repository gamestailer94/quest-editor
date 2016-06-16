// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


(function($){
    //VARS
    const ipc = require('electron').ipcRenderer;
    const fs = require('fs');
    const path = require('path');
    const sha1 = require('sha1');
    const md5 = require('md5');
    const winston = require('winston');
    const logger = new(winston.Logger)({
        transports:[
            new (winston.transports.File)({ filename: 'renderer.log', json: false })
        ]
    });

    var maxValue = 1;
    var categories = ['Primary', 'Secondary'];
    var projectDir = '';
    var quests = [{
        name: "<Name>",
        id: 1,
        icon: 0,
        desc: "<Description>",
        cat: 0,
        rewards: [['item', 1, 1, false]],
        steps: [['<Step>', false, 1, 1, false,'default',false]]
    }];
    var elQuests = $('#quests');
    var variables = [];
    var items = {};
    var weapons = {};
    var armors = {};
    var rewardTypes = {'item': 'Item',
        'weapon' : 'Weapon',
        'armor': 'Armor',
        'xp': 'XP',
        'gold': 'Gold',
        'custom': 'Text'};
    var icons;




    //STARTUP
    if(!localStorage.getItem('projectFolder')){
        $('#noFolder').removeClass('hidden');
     }else{
         loadProject();
     }

    //FUNCTIONS

    function pad (str, max) {
        max = max || 3;
        str = str.toString();
        return str.length < max ? pad("0" + str, max) : str;
    }

    function loadProject(){
        $('#noFolder').addClass('hidden');
        $('#wrongFolder').addClass('hidden');
        $('#loader').removeClass('hidden');
        projectDir = path.normalize(localStorage.getItem('projectFolder'));
        var cont = true;
        try {
            fs.accessSync(path.join(projectDir,'Game.rpgproject'));
        } catch (Exception){
            $('#wrongFolder').removeClass('hidden');
            $('#loader').addClass('hidden');
            cont = false;
            logger.warn("Cant Access Game.rpgproject ("+projectDir+"), wrong Folder or no Permissions?");
        }
        if(cont) {
            try{
                var file = fs.openSync(path.join(projectDir, '/data/Quests.json'), 'a+');
                var read = fs.readFileSync(file, {encoding: 'utf8'});
                fs.closeSync(file);
            } catch(Exception){
                logger.error("Exception while trying to Open/Create Quests.json");
                logger.error(Exception);
                var read = '';
            }
            if (read != '') {
                loadData(read);
                maxValue = quests.length;
            }

            loadSystem();
            reloadQuests();
        }
    }

    function showQuests(){
        try {
            var newQuest;
            $.each(quests, function (index, value) {
                newQuest = getPanel(value.name, value.desc, value.id, value.steps, value.rewards, value.icon, value.cat);
                elQuests.append(newQuest);
            });
        }catch(e){
            logger.error("Error while Drawing Panels");
            logger.error(e);
            ipc.send("showError",e.stack);
        }
    }

    function reloadQuests(){
        $('#loader').removeClass('hidden');
        $('#mainContent').addClass('hidden');
        try {
            clearQuests();
            showQuests();
            checkPlugin();
        }catch(e){
            logger.error("General Error in reloadQuests");
            logger.error(e);
            ipc.send("showError", e.stack);
        }
        $('#loader').addClass('hidden');
        $('#mainContent').removeClass('hidden');
    }

    function loadData(data){
        logger.info("Loading Data");
        try {
            var json = JSON.parse(data);
        }catch(Exception){
            logger.error("Error loading Data");
            logger.error(Exception);
            ipc.send("showError", Exception.stack);
        }
        categories = json.shift();
        
        //check if first element is real quest or garbage
        if(typeof json[0].id == 'undefined') {
            logger.error("locks like a malformed json, fixing");
            ipc.send("showInfo", "It looks like your Quests.json is malformed, we will try to fix this.\n\nIt may be possible that this removes some Quests, you should try to re-add them.");
            while (typeof json[0].id == 'undefined') {
                //shift once more
                var deleted = json.shift();
                logger.error("Removed:");
                logger.error(deleted);
            }
        }
        quests = json;
        //test if new elements are missing
        for(var i = 0; i < quests.steps.length; i++){
            if(typeof quests.steps[5] == 'undefined')
                quests.steps[5] = 'default';
            if(typeof quests.steps[6] == 'undefined')
                quests.steps[6] = false;
        }
    }
    
    function clearQuests(){
        elQuests.empty();
    }

    function getPanel(title, desc, id, steps, rewards, iconID, category){
        var randId = sha1(Math.floor(Math.random()*1000000));
        while($('#'+randId).length != 0){
            randId = sha1(Math.floor(Math.random()*1000000));
        }
        return $('<div>',{
            'class': 'panel panel-default',
            'data-id': id
        }).append(
            $('<div>', {
                'class': 'panel-heading',
                role: 'tab'
            }).append(
                $('<h4>',{
                    'class':'panel-title'
                }).append(
                    $('<a>',{
                        role: 'button',
                        'data-toggle': 'collapse',
                        'data-parent': '#quests',
                        href: '#'+randId,
                        html: pad(id)+': '+encodeHtml(title)
                    })
                ).append(
                    $('<i>', {
                        'class': 'glyphicon glyphicon-pencil pull-right click editQuest'
                    })
                )
            )
        ).append(
            $('<div>', {
                'class': 'panel-collapse collapse',
                'id': randId,
                role: 'tabpanel'
            }).append(
                $('<div>', {
                    'class': 'panel-body'
                }).append(
                    $('<div>', {
                        'class': 'row'
                    }).append(
                        $('<div>',{
                            'class': 'col-sm-8 desc'
                        }).append(
                            $('<textarea>',{
                                'class': 'desc form-control',
                                html: desc
                            })
                        )
                    ).append(
                        $('<div>', {
                            'class': 'col-sm-4'
                        }).append(
                            $('<div>',{
                                'class': 'col-sm-6'
                            }).append(
                                $('<p>',{
                                    html: 'Icon:'
                                })
                            ).append(
                                $('<div>', {
                                    'class': 'iconDiv iconEdit'
                                }).css('background-position', getIconPosition(iconID))
                            )
                        ).append(
                            $('<div>',{
                                'class': 'col-sm-6'
                            }).append(
                                $('<p>',{
                                    html: 'Category:'
                                })
                            ).append(
                                $('<div>', {
                                    'class': 'cat',
                                    html: getCategoryEl(category)
                                })
                            )
                        )
                    ).append(
                        $('<div>',{
                            'class': 'col-sm-12'
                        }).append(
                            $('<div>',{
                                'class': 'panel panel-default space'
                            }).append(
                                $('<div>', {
                                    'class': 'panel-heading',
                                    role: 'tab'
                                }).append(
                                    $('<h4>',{
                                        'class':'panel-title'
                                    }).append(
                                        $('<a>',{
                                            role: 'button',
                                            'data-toggle': 'collapse',
                                            'data-parent': '#'+randId,
                                            href: '#'+randId+'Steps',
                                            html: 'Steps'
                                        })
                                    )
                                )
                            ).append(
                                $('<div>', {
                                    'class': 'panel-collapse collapse in',
                                    'id': randId+'Steps',
                                    role: 'tabpanel'
                                }).append(
                                    $('<div>', {
                                        'class': 'panel-body bodySteps'
                                    }).append(
                                        getSteps(steps)
                                    ).append(
                                        $('<button>',{
                                            type: 'button',
                                            'class': 'btn btn-primary addStep pull-right',
                                            html: 'Add'
                                        })
                                    )
                                )
                            )
                        )
                    ).append(
                        $('<div>',{
                            'class': 'col-sm-12'
                        }).append(
                            $('<div>',{
                                'class': 'panel panel-default space'
                            }).append(
                                $('<div>', {
                                    'class': 'panel-heading',
                                    role: 'tab'
                                }).append(
                                    $('<h4>',{
                                        'class':'panel-title'
                                    }).append(
                                        $('<a>',{
                                            role: 'button',
                                            'data-toggle': 'collapse',
                                            'data-parent': '#'+randId,
                                            href: '#'+randId+'Rewards',
                                            html: 'Rewards'
                                        })
                                    )
                                )
                            ).append(
                                $('<div>', {
                                    'class': 'panel-collapse collapse in',
                                    'id': randId+'Rewards',
                                    role: 'tabpanel'
                                }).append(
                                    $('<div>', {
                                        'class': 'panel-body bodyRewards'
                                    }).append(
                                        getRewards(rewards)
                                    ).append(
                                        $('<button>',{
                                            type: 'button',
                                            'class': 'btn btn-primary addReward pull-right',
                                            html: 'Add'
                                        })
                                    )
                                )
                            )
                        )
                    )
                )
            )
        );
    }

    function getCategoryEl(category){
        var el = $('<select>',{
            'class': 'setCategory form-control'
        });
        $.each(categories, function(index, value){
            el.append(
                $('<option>',{
                    value: index,
                    html: encodeHtml(value),
                    selected: category == index+1
                })
            )
        });

        return el;
    }

    function getIconPosition(id){
        if(id <= 0){
            return '0 0';
        }else {
            var row = Math.floor(id / 16);
            if (row < 0) row = 0;
            var col = id - (16 * row);
            if (col < 0) col = 0;

            return '-' + col * 32 + 'px -' + row * 32 + 'px'
        }
    }

    function getSteps(steps){
        var table = $('<table>',{
            'class': 'table table-striped table-condensed'
        }).append(
            $('<colgroup>')
                .append(
                    $('<col>',{width: '50%'})
                ).append(
                    $('<col>',{width: '10%'})
                ).append(
                    $('<col>',{width: '20%'})
                ).append(
                    $('<col>',{width: '10%'})
                ).append(
                    $('<col>',{width: '2%'})
                ).append(
                    $('<col>',{width: '8%'})
                )
        ).append(
            $('<thead>').append(
                    $('<tr>')
                        .append(
                            $('<th>',{
                                html: 'Step'
                            })
                        ).append(
                            $('<th>',{
                                html: 'Show Progress'
                            })
                        ).append(
                            $('<th>',{
                                html: 'Variable'
                            })
                        ).append(
                            $('<th>',{
                                html: 'Max Value'
                            })
                        ).append(
                            $('<th>',{
                                html: 'Percentage',
                                colspan: 2
                            })
                        )
                )
        ).append(
            $('<tbody>')
        );


        $.each(steps, function(index, value){
            table.find('tbody').append(
                $('<tr>', {
                    'data-index': index
                }).append(
                    $('<td>').append(
                        $('<input>',{
                            type: 'text',
                            'class': 'form-control input-sm editStep',
                            value: value[0]
                        })
                    )
                ).append(
                    $('<td>').append(
                        $('<input>',{
                            type: 'checkbox',
                            'class': 'editStepProgress',
                            checked: value[1]
                        })
                    )
                ).append(
                    $('<td>',{
                        html: createVariablesEl(value[2])
                    })
                ).append(
                    $('<td>').append(
                        $('<input>',{
                            type: 'number',
                            'class': 'form-control input-sm editStepMaxValue',
                            value: value[3],
                            'min': 1,
                            'max': 999
                        })
                    )
                ).append(
                    $('<td>').append(
                        $('<input>',{
                            type: 'checkbox',
                            'class': 'editStepPercentage',
                            checked: value[4]
                        })
                    )
                ).append(
                    $('<td>').append(
                        $('<i>',{
                            'class': 'glyphicon glyphicon-trash pull-right click delStep'
                        })
                    ).append(
                        $('<i>',{
                            'class': 'glyphicon glyphicon-chevron-down pull-right click moveDownStep'
                        })
                    ).append(
                        $('<i>',{
                            'class': 'glyphicon glyphicon-chevron-up pull-right click moveUpStep'
                        })
                    )
                )
            )
        });
        return table;
    }

    function getRewards(rewards){
        var table = $('<table>',{
            'class': 'table table-striped table-condensed'
        }).append(
            $('<colgroup>')
                .append(
                    $('<col>',{width: '15%'})
                ).append(
                    $('<col>',{width: '35%'})
                ).append(
                    $('<col>',{width: '35%'})
                ).append(
                    $('<col>',{width: '5%'})
                ).append(
                    $('<col>',{width: '10%'})
                )
        ).append(
            $('<thead>').append(
                $('<tr>')
                    .append(
                        $('<th>',{
                            html: 'Type'
                        })
                    ).append(
                        $('<th>',{
                            html: 'Item'
                        })
                    ).append(
                        $('<th>',{
                            html: 'Amount/ Text'
                        })
                    ).append(
                        $('<th>',{
                            html: 'Hidden',
                            colspan: 2
                        })
                    )
            )
        ).append(
            $('<tbody>')
        );

        $.each(rewards, function(index, value){

            table.find('tbody').append(
                $('<tr>', {
                    'data-index': index
                }).append(
                    $('<td>').append(
                        createRewardTypeEl(value[0])
                    )
                ).append(
                    $('<td>').append(
                        createRewardsItemsEl(value[0],value[1])
                    )
                ).append(
                    $('<td>').append(
                        createRewardAmountEl(value[0],value[2], value[1])
                    )
                ).append(
                    $('<td>').append(
                        $('<input>',{
                            type: 'checkbox',
                            'class': 'editHiddenRewards',
                            checked: value[3]
                        })
                    )
                ).append(
                    $('<td>').append(
                        $('<i>',{
                            'class': 'glyphicon glyphicon-trash pull-right click delReward'
                        })
                    ).append(
                        $('<i>',{
                            'class': 'glyphicon glyphicon-chevron-down pull-right click moveDownReward'
                        })
                    ).append(
                        $('<i>',{
                            'class': 'glyphicon glyphicon-chevron-up pull-right click moveUpReward'
                        })
                    )
                )
            )
        });

        return table;
    }

    function createRewardAmountEl(type, value, value2){
        if(type != 'custom'){
            if(type != 'xp' && type != 'gold'){
                return $('<input>', {
                    'class': 'form-control input-sm editRewardValue',
                    value: parseInt(value),
                    type: 'number',
                    'min': 1
                })
            }else {
                return $('<input>', {
                    'class': 'form-control input-sm editRewardValue',
                    value: parseInt(value2),
                    type: 'number',
                    'min': 1
                })
            }
        }else{
            return $('<input>',{
                'class': 'form-control input-sm editRewardValue',
                value: value,
                type: 'text'
            })
        }
    }

    function createRewardTypeEl(selected){
        var el = $('<select>',{
            'class': 'editRewardType form-control input-sm'
        });
        $.each(rewardTypes, function(index, value){
            el.append(
                $('<option>',{
                    value: index,
                    html: value,
                    selected: selected == index
                })
            )
        });

        return el;
    }

    function createRewardsItemsEl(type, selected){
        var item;
        switch(type){
            case 'item':
                item = items;
                break;
            case 'armor':
                item = armors;
                break;
            case 'weapon':
                item = weapons;
                break;
            default:
                item = false;
                break;
        }
        if(item){
            var el = $('<select>',{
                'class': 'editRewardItem form-control input-sm'
            });
            $.each(item, function(index, value){
                el.append(
                    $('<option>',{
                        value: index,
                        html: value,
                        selected: selected == index
                    })
                )
            });
            return el;
        }else{
            return $('<select>', {
                disabled: true,
                'class': 'form-control input-sm'
            });
        }

    }

    function createVariablesEl(selected){
        var el = $('<select>',{
            'class': 'editStepVariable form-control input-sm'
        });
        $.each(variables, function(index, value){
            el.append(
                $('<option>',{
                    value: index,
                    html: pad(index+1)+ ' '+ encodeHtml(value),
                    selected: selected == index+1
                })
            )
        });

        return el;
    }

    function loadSystem(){
        try{
            var file = fs.openSync(path.join(projectDir, '/data/System.json'), 'r');
            var read = fs.readFileSync(file, {encoding: 'utf8'});
            fs.closeSync(file);
            var tempVariables = JSON.parse(read).variables;
            variables = [];
            $.each(tempVariables,function(index, value){
                if(value == ''){
                    value = '<Empty>'
                }
                variables.push(value);
            });
            variables.splice(0,1);

            file = fs.openSync(path.join(projectDir, '/data/Items.json'), 'r');
            read = fs.readFileSync(file, {encoding: 'utf8'});
            fs.closeSync(file);
            var tempItems = JSON.parse(read);
            items = {};
            $.each(tempItems, function(index, value){
                if(value != null){
                    if(value.name == ''){
                        value.name = '<Empty>'
                    }
                    items[value.id] = value.name;
                }
            });

            file = fs.openSync(path.join(projectDir, '/data/Weapons.json'), 'r');
            read = fs.readFileSync(file, {encoding: 'utf8'});
            fs.closeSync(file);
            var tempWeapons = JSON.parse(read);
            weapons = {};
            $.each(tempWeapons, function(index, value){
                if(value != null){
                    if(value.name == ''){
                        value.name = '<Empty>'
                    }
                    weapons[value.id] = value.name;
                }
            });

            file = fs.openSync(path.join(projectDir, '/data/Armors.json'), 'r');
            read = fs.readFileSync(file, {encoding: 'utf8'});
            fs.closeSync(file);
            var tempArmors = JSON.parse(read);
            armors = {};
            $.each(tempArmors, function(index, value){
                if(value != null){
                    if(value.name == ''){
                        value.name = '<Empty>'
                    }
                    armors[value.id] = value.name;
                }
            });

            file = fs.openSync(path.join(projectDir, '/img/system/IconSet.png'), 'r');
            read = fs.readFileSync(file);
            fs.closeSync(file);
            icons = read.toString('base64');
            $('head').find('style').html('.iconDiv{ background:  url(data:image/png;base64,'+icons+') no-repeat left top;}');
        } catch(Exception){
            logger.error("Error while loading System Files");
            logger.error(Exception);
            ipc.send('showError',Exception.stack);
        }
    }

    function checkPlugin(){
        var installed = false;
        try {
            fs.accessSync(path.join(projectDir, '/js/plugins/GS_QuestSystem.js'))
            var plugin = md5(fs.readFileSync(path.join(projectDir, '/js/plugins/GS_QuestSystem.js')));
            var builtin = md5(fs.readFileSync(path.join(__dirname, '/res/GS_QuestSystem.js')));
            if (plugin != builtin) {
                ipc.send('updatePluginDialog');
            }
            installed = true;
        } catch(Exception){
            logger.log("debug","Error while Accessing JS Plugin");
            logger.log("debug",Exception);
        }
        if(!installed) {
            try {
                fs.accessSync(path.join(projectDir, '/js/plugins/GameusQuestSystem.js'));
                ipc.send('replacePluginDialog');
                installed = true
            } catch (Exception) {
                logger.log("debug","Error while Accessing Legacy JS Plugin");
                logger.log("debug",Exception);
            }
        }
        if(!installed) {
            ipc.send('installPluginDialog')
        }
    }

    function updatePlugin(event, select){
        if(select === 0){
            try {
                var newPlugin = fs.readFileSync(path.join(__dirname, '/res/GS_QuestSystem.js'));
                fs.writeFileSync(path.join(projectDir, '/js/plugins/GS_QuestSystem.js'), newPlugin);
            } catch(Exception){

                logger.error("Error while Updating JS Plugin");
                logger.error(Exception);
                ipc.send('showError',Exception.stack);
            }
        }
    }

    function replacePlugin(event, select){
        if(select === 0){
            try {
                var newPlugin = fs.readFileSync(path.join(__dirname, '/res/GS_QuestSystem.js'));
                fs.writeFileSync(path.join(projectDir, '/js/plugins/GS_QuestSystem.js'),newPlugin);
                fs.unlinkSync(path.join(projectDir, '/js/plugins/GameusQuestSystem.js'));
            } catch(Exception){
                logger.error("Error while replacing JS Plugin");
                logger.error(Exception);
                ipc.send('showError',Exception.stack);
            }
        }
    }

    function installPlugin(event, select){
        if(select === 0){
            try {
                var newPlugin = fs.readFileSync(path.join(__dirname, '/res/GS_QuestSystem.js'));
                fs.writeFileSync(path.join(projectDir, '/js/plugins/GS_QuestSystem.js'),newPlugin);
            } catch(Exception){
                logger.error("Error while installing JS Plugin");
                logger.error(Exception);
                ipc.send('showError',Exception.stack);
            }
        }
    }

    function encodeHtml(text) {
        return $('<div>').text(text).html();
    }
    
    function setMax(){
        maxValue = $('#maxValue').val();
        if(maxValue > 0 && maxValue <= 999) {
            $('#maxModal').modal('hide');
            $('#loader').removeClass('hidden');
            $('#mainContent').addClass('hidden');
            if(quests.length != maxValue){
                //better in second thread then here
                ipc.send('setMax', quests, maxValue);
            }
        }else{
            maxValue = quests.length;
        }
    }

    function updateProgress(event, percent){
        var progress = $('#loader').find('.progress-bar');
        progress.css('width', percent+'%');
    }
    

    function saveQuests(){
        var data = $.merge([], quests);
        data.unshift(categories);
        data = JSON.stringify(data);
        try {
            var file = fs.openSync(path.join(projectDir, '/data/Quests.json'), 'w');
            fs.writeFileSync(file, data, {encoding: 'utf8'});
            fs.closeSync(file);
            $('#saved').slideDown();
            setTimeout(function () {
                $('#saved').slideUp();
            }, 3000);
        }catch(e){
            logger.error("Error while Saving Quests.json");
            logger.error(e);
        }
    }

    function editQuest(){
        var that = $(this);
        var heading = that.parent();
        var title = that.siblings('a');
        var titleHref = title.attr('href');
        var questId = that.parents('.panel-default').data('id');
        heading.empty();

        heading.append(
            $('<input>', {
                value: quests[questId-1].name,
                'data-href': titleHref,
                'class': 'textQuest'
            })
        ).append(
            $('<i>', {
                'class':'glyphicon glyphicon-ok pull-right saveQuest click'
            })
        )
    }

    function saveQuest(event, that){
        that = that || $(this);
        var heading = that.parent();
        var input = that.siblings('input');
        var titleHref = input.data('href');
        var title = input.val();
        var questId = that.parents('.panel-default').data('id');
        quests[questId-1].name =  title;
        heading.empty();

        heading.append(
            $('<a>',{
                role: 'button',
                'data-toggle': 'collapse',
                'data-parent': '#quests',
                href: titleHref,
                html: pad(questId)+': '+encodeHtml(title)
            })
        ).append(
            $('<i>', {
                'class': 'glyphicon glyphicon-pencil pull-right click editQuest'
            })
        )
    }


    function saveDesc(){
        var that = $(this);
        var questId = that.parents('.panel-default').data('id');
        quests[questId-1].desc = that.val();
    }

    function saveIcon(event, questId, iconId){
        quests[questId-1].icon= iconId;
        elQuests.find('[data-id='+questId+']').find('.iconDiv').css('background-position', getIconPosition(iconId))
    }

    function saveCat(){
        var that = $(this);
        var questId = that.parents('.panel-default').data('id');
        quests[questId-1].cat = Number(that.find('select').val());

    }

    function saveStep(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        quests[questId-1].steps[stepIndex][0] = that.val();
    }

    function saveStepMaxValue(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        quests[questId-1].steps[stepIndex][3] = Number(that.val());
    }

    function saveStepProgress(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        quests[questId-1].steps[stepIndex][1] = that.is(':checked');
    }

    function saveStepVariable(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        quests[questId-1].steps[stepIndex][2] = Number(that.val())+1;
    }

    function saveStepPercentage(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        quests[questId-1].steps[stepIndex][4] = that.is(':checked');
    }

    function moveUpStep(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodySteps');
        if(stepIndex > 0) {
            quests[questId - 1].steps.move(stepIndex, stepIndex - 1);
            redrawSteps(questId, parent);
        }
    }
    function moveDownStep(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodySteps');
        if(stepIndex < quests[questId-1].steps.length-1) {
            quests[questId - 1].steps.move(stepIndex, stepIndex + 1);
            redrawSteps(questId, parent);
        }
    }

    function delStep(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var stepIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodySteps');
        quests[questId-1].steps.splice(stepIndex, 1);
        redrawSteps(questId, parent);
    }

    function addStep(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var parent = that.parents('.bodySteps');
        quests[questId-1].steps.push(["<Step>",false, 1, 1, false, 'default', false]);
        redrawSteps(questId,parent);
    }
    
    function redrawSteps(questId,parent){
        parent.empty();
        parent.append(getSteps(quests[questId-1].steps));
        parent.append(
            $('<button>',{
                type: 'button',
                'class': 'btn btn-primary addStep pull-right',
                html: 'Add'
            })
        )
    }

    function moveUpReward(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodyRewards');
        if(rewardIndex > 0) {
            quests[questId - 1].rewards.move(rewardIndex, stepIndex - 1);
            redrawRewards(questId, parent);
        }
    }
    function moveDownReward(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodyRewards');
        if(rewardIndex < quests[questId-1].steps.length-1) {
            quests[questId - 1].rewards.move(rewardIndex, stepIndex + 1);
            redrawRewards(questId, parent);
        }
    }

    function delReward(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodyRewards');
        quests[questId-1].rewards.splice(rewardIndex, 1);
        redrawRewards(questId, parent);
    }

    function addReward(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var parent = that.parents('.bodyRewards');
        quests[questId-1].rewards.push(['item', 1, 1, false]);
        redrawRewards(questId,parent);
    }

    function editRewardType(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        var parent = that.parents('.bodyRewards');
        quests[questId-1].rewards[rewardIndex][0] = that.val();
        redrawRewards(questId, parent);
    }

    function editRewardItem(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        quests[questId-1].rewards[rewardIndex][1] = Number(that.val());
    }

    function editRewardValue(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        if(quests[questId-1].rewards[rewardIndex][0] != 'custom') {
            if(quests[questId-1].rewards[rewardIndex][0] != 'gold' && quests[questId-1].rewards[rewardIndex][0] != 'xp') {
                quests[questId - 1].rewards[rewardIndex][2] = Number(that.val());
            }else {
                quests[questId - 1].rewards[rewardIndex][1] = Number(that.val());
            }
        }else{
            quests[questId - 1].rewards[rewardIndex][2] = that.val();
        }
    }

    function editHiddenRewards(){
        var that = $(this);
        var questId = that.parents('.panel-default').parents('.panel-default').data('id');
        var rewardIndex = that.parents('tr').data('index');
        quests[questId-1].rewards[rewardIndex][3] = that.is(':checked');
    }

    function redrawRewards(questId, parent){
        parent.empty();
        parent.append(getRewards(quests[questId-1].rewards));
        parent.append(
            $('<button>',{
                type: 'button',
                'class': 'btn btn-primary addReward pull-right',
                html: 'Add'
            })
        )
    }


    //EVENTS
    
    $('#saveQuests').on('click', saveQuests);

    elQuests.on('click','.editQuest', editQuest);
    elQuests.on('click','.saveQuest', saveQuest);
    elQuests.on('keyup','.textQuest', function(e){
        if (e.keyCode == 13) {
            saveQuest(e,$(this).siblings('i'));
        }
    });
    elQuests.on('change','textarea.desc', saveDesc);
    elQuests.on('change','.cat', saveCat);
    elQuests.on('change','.editStep', saveStep);
    elQuests.on('change','.editStepMaxValue', saveStepMaxValue);
    elQuests.on('change','.editStepProgress', saveStepProgress);
    elQuests.on('change','.editStepVariable', saveStepVariable);
    elQuests.on('change','.editStepPercentage', saveStepPercentage);
    elQuests.on('click','.moveUpStep', moveUpStep);
    elQuests.on('click','.moveDownStep', moveDownStep);
    elQuests.on('click','.delStep', delStep);
    elQuests.on('click','.addStep', addStep);
    elQuests.on('click','.moveUpReward', moveUpReward);
    elQuests.on('click','.moveDownReward', moveDownReward);
    elQuests.on('click','.delReward', delReward);
    elQuests.on('click','.addReward', addReward);
    elQuests.on('change','.editRewardType', editRewardType);
    elQuests.on('change','.editRewardItem', editRewardItem);
    elQuests.on('change','.editRewardValue', editRewardValue);
    elQuests.on('change','.editHiddenRewards', editHiddenRewards);
    elQuests.on('click','.iconEdit', function(){
        ipc.send('openIconWindow', $(this).parents('.panel-default').data('id'), icons);
    });

    $('#setMax').on('click', function(){
        $('#maxValue').val(maxValue);
        $('#maxModal').modal();
    });

    $('#saveMax').on('click', setMax);

    $('#setCategories').on('click', function(){
        ipc.send('openCategories');
    });

    ipc.on('getCategories', function(){
        ipc.send('sendCategories', categories);
    });

    ipc.on('saveCategories', function(events, newCategories){
        categories = newCategories;
        elQuests.find('.cat').each(function(index,value){
            value = $(value);
            var questId = value.parents('.panel-default').data('id');
            value.empty();
            value.html(getCategoryEl(quests[questId-1].cat+1));
        })
    });

    $('.setProjectDirectory').on('click',function(){
        ipc.send('setProjectDirectory')
    });

    ipc.on('setProjectDirectory', function (event, dir) {
        localStorage.setItem('projectFolder',dir);
        loadProject();
    });

    ipc.on('reloadQuests', function (){
        loadProject();
    });

    ipc.on('saveIcon', saveIcon);

    ipc.on('updateMaxProgress', updateProgress);
    
    ipc.on('returnMax', function(event, newQuests){
        quests = newQuests;
        updateProgress(null,100);
        setTimeout(reloadQuests, 200);
    });

    ipc.on('updatePluginDialogReturn', updatePlugin);
    ipc.on('replacePluginDialogReturn', replacePlugin);
    ipc.on('installPluginDialogReturn', installPlugin);

})(jQuery);

Array.prototype.move = function (old_index, new_index) {
    while (old_index < 0) {
        old_index += this.length;
    }
    while (new_index < 0) {
        new_index += this.length;
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
};