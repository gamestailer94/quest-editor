(function($){
    const ipc = require('electron').ipcRenderer;
    var maxValue = 0;
    var quests = {};

    ipc.send('getMax');

    ipc.on('setMax', function(event, Quests,NewMax){
        quests = Quests;
        maxValue = NewMax;

        var currValue = quests.length;
        if (currValue < maxValue) {
            //maybe takes looong, add elements
            while (maxValue > quests.length) {
                quests.push({
                    name: "<Name>",
                    id: getMaxId() + 1,
                    icon: 0,
                    desc: "<Description>",
                    cat: 0,
                    rewards: [['item', 1, 1, false]],
                    steps: [['<Step>', false, 1, 1, false]]
                });
                ipc.send('updateMaxProgress', (quests.length/maxValue)*100);
            }
        } else if (currValue > maxValue) {
            //great, remove elements
            ipc.send('updateMaxProgress', 50);
            quests.splice(maxValue, quests.length-maxValue);
        }

        ipc.send('returnMax', quests);
    });

    function getMaxId(){
        var id = 1;
        $.each(quests, function(index, value){
            if(id < value.id){
                id = value.id;
            }
        });
        return id;
    }
})(jQuery);