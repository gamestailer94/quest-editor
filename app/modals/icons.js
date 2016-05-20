(function($){
    const ipc = require('electron').ipcRenderer;
    var questID = 0;
    var iconId = 0;


    ipc.send('getIcons');


    function drawTable() {
        var table = $('<table>',{
            'class': 'grid'
        });
        var id = 0;
        for(var row = 1; row <= 20; row++){
            var elRow = $('<tr>');
            for(var col = 1; col <= 16; col++){
                var elCol = $('<td>',{
                    'class': 'click',
                    'data-id': id
                });
                elRow.append(elCol);
                id++;
            }
            table.append(elRow);
        }

        $(".icons").append(table);
    }

    function selectIcon(){
        var that = $(this);
        iconId = that.data('id');
        $('#iconId').html(iconId);
        $('.grid').find('td').removeClass('active');
        that.addClass('active');
    }

    function saveIcon(){
        ipc.send('saveIcon', questID, iconId)
    }

    $('#saveIcon').on('click', saveIcon);

    $('.icons').on('click', 'td', selectIcon);

    ipc.on('setIconId', function(event, id, icons){
        questID = id;
        $('head').find('style').html('.icons{ background: url(data:image/png;base64,'+icons+') no-repeat left top;}');
        drawTable();
    })

    
})(jQuery);