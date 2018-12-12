// menu
console.clear();

var el = {};

$('.placeholder').on('click', function (ev) {
  $('.placeholder').css('opacity', '0');
  $('.list__ul').toggle();
});

 $('.list__ul a').on('click', function (ev) {
   ev.preventDefault();
   var index = $(this).parent().index();
   
   $('.placeholder').text( $(this).text() ).css('opacity', '1');
   
   console.log($('.list__ul').find('li').eq(index).attr("id"));
   
   $('.list__ul').find('li').eq(index).prependTo('.list__ul');
   $('.list__ul').toggle();   
   
 });


$('select').on('change', function (e) {
  
  // Set text on placeholder hidden element
  $('.placeholder').text(this.value);
  
  // Animate select width as placeholder
  $(this).animate({width: $('.placeholder').width() + 'px' });
  
});


// image viewer
var modal = document.getElementById('galleryModal');
var images = document.getElementsByClassName('gallery-images');
var modalImg = document.getElementById("img01");
var captionText = document.getElementById("caption");

for (var i = 0; i < images.length; i++) {
  var img = images[i];
  img.onclick = function(evt) {
    modal.style.display = "block";
    modalImg.src = this.src;
    captionText.innerHTML = this.alt;
  }
}

var span = document.getElementsByClassName("close")[0];

span.onclick = function() {
  modal.style.display = "none";
}
