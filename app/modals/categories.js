(function($){
    const ipc = require('electron').ipcRenderer;
    var categories = [];
    var elCat = $('#categories');

    ipc.send('getCategories');

    ipc.on('sendCategories', function(event, newCategories){
        categories = newCategories;
        reloadCats();
    });
    
    $('#addCat').on('click',addCat);
    $('#saveCats').on('click',saveCats);
    elCat.on('click','i.removeCat', delCat);
    elCat.on('click','i.editCat', editCat);
    elCat.on('click','i.saveCat', saveCat);
    elCat.on('click','i.revertCat', reloadCats);


    
    function showCats(){
        $.each(categories,function(index, value){
            elCat.append(
                $('<li>', {
                    'class': 'list-group-item',
                    html: value,
                    'data-org': value,
                    'data-index': index
                }).append(
                    $('<i>', {
                        'class': 'glyphicon glyphicon-trash pull-right removeCat click'
                    })
                ).append(
                    $('<i>', {
                        'class':'glyphicon glyphicon-pencil pull-right editCat click'
                    })
                )
            )
        })
    }

    function addCat(){
        categories.push('New Category');
        reloadCats();
    }

    function editCat(){
        var li = $(this).parents('li');
        var org = li.data('org');
        li.empty();
        li.append(
            $('<input>', {
                value: org,
                type: 'text'
            })
        ).append(
            $('<i>', {
                'class': 'glyphicon glyphicon-remove pull-right revertCat click'
            })
        ).append(
            $('<i>', {
                'class':'glyphicon glyphicon-ok pull-right saveCat click'
            })
        )

    }

    function saveCat(){
        var index = $(this).parents('li').data('index');
        categories[index] = $(this).siblings('input').val();
        reloadCats();
    }

    function delCat(){
        var index = $(this).parents('li').data('index');
        categories.splice(index, 1);
        reloadCats();
    }

    function saveCats(){
        ipc.send('saveCategories', categories);
    }

    function reloadCats(){
        clearCats();
        showCats();
    }

    function clearCats(){
        elCat.empty();
    }

})(jQuery);
