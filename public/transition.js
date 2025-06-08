var images = [
	"https://ryryfn.com/filterImages/craggy.png",
	"https://ryryfn.com/filterImages/authority.png",
	"https://ryryfn.com/filterImages/agency.png",
	"https://ryryfn.com/filterImages/salty.png",
	"https://ryryfn.com/filterImages/rig.png",
	"https://ryryfn.com/filterImages/sweaty.png",
	"https://ryryfn.com/filterImages/pleasant.png",
	"https://ryryfn.com/filterImages/slurpy.png",
	"https://ryryfn.com/filterImages/grotto.jpg",
	"https://ryryfn.com/filterImages/steamy.png",
	]
	
var current = 0;
var banner;
document.addEventListener("DOMContentLoaded", ()=> {
	banner = document.querySelector(".banner");
	changeImage();
	setInterval(changeImage, 2000);
});

function changeImage() {
	var imageSelected = current % images.length;
	banner.style.backgroundImage = `url('${images[imageSelected]}')`;
	current++;
}

	