if ($('#accordion').on('shown.bs.collapse')) {
        $('.about-plus').hide();
        $('.about-minus').show();
    } else {
        $('.about-plus').show();
        $('.about-minus').hide();        
    }


$('#accordion').on('shown.bs.collapse', function () {
    $('.about-plus').hide();
    $('.about-minus').show();
});

$('#accordion').on('hidden.bs.collapse', function () {
    $('.about-plus').show();
    $('.about-minus').hide();
});