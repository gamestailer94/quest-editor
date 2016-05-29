(function($){
    const ipc = require('electron').ipcRenderer;
    var questID = 0;
    var iconId = 0;
    var iconImg;


    ipc.send('getIcons');


    function drawTable() {
        var table = $('<table>',{
            'class': 'grid'
        });
        var rows = iconImg.height/32;
        var cols = iconImg.width/32;
        console.log(rows);
        console.log(cols);
        var id = 0;
        for(var row = 1; row <= rows; row++){
            var elRow = $('<tr>');
            for(var col = 1; col <= cols; col++){
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
        iconImg = new Image();
        iconImg.src = 'data:image/png;base64,'+icons;
        questID = id;
        $('head').find('style').html('.icons{ background: url(data:image/png;base64,'+icons+') no-repeat left top;}');
        drawTable();
    })

    
})(jQuery);