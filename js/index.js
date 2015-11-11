var items_list = ['Find Products Next To You', 'Find Flavors Of India', 'Find Pani Puri...', 'Find Dosa...', 'Find Idli...'];
var colors = ["ALICEBLUE", 'ANTIQUEWHITE', 'BLANCHEDALMOND', 'BEIGE', 'LIGHTSKYBLUE'];
var items_var = 0;
var colors_var = 0;
var find_items = '';
$(document).ready(function () {
	setupRotator();
	//document.addEventListener('deviceready', onDeviceReady, false);
});
function setupRotator() {
	if ($('.textItem').length > 1) {
		//$('.textItem:first').addClass('current').fadeIn(10000);
		//window.alert($('.textItem').first().attr());
		find_items = items_list[items_var];
		$('#text_search').attr("placeholder", find_items).addClass('current').fadeIn(10000);
		setInterval('textRotate()', 10000);
		items_var++;
		colors_var++;
	}
}
function textRotate() {

	var current = $('#text_search > .current');
	/*
	if (current.next().length == 0) {
	current.removeClass('current').fadeOut(10000);
	$('.textItem:first').addClass('current').fadeIn(10000);
	} else {
	current.removeClass('current').fadeOut(10000);
	current.next().addClass('current').fadeIn(10000);
	} */
	current.removeClass('current').fadeOut(10000);
	//window.alert(items_list.length)
	if (items_var == items_list.length) {
		items_var = 0;
	}
	if (colors_var == colors.length) {
		colors_var = 0;
	}

	$('#text_search').attr("placeholder", items_list[items_var]).addClass('current').fadeIn(10000);
	items_var++;
	colors_var++;

}
function querySt(ji) {

    hu = window.location.search.substring(1);
    gy = hu.split("&");

    for (i=0;i<gy.length;i++) {
        ft = gy[i].split("=");
        if (ft[0] == ji) {
            return ft[1];
        }
    }
}
function SwapDivsWithClick(div) {
	d = document.getElementById(div);
	d1 = document.getElementById('result_box');
	if (d.style.display == "none") {
		d1.innerHTML = d1.innerHTML.replace("see", "hide");
		d.style.display = "block";
	} else {
		d1.innerHTML = d1.innerHTML.replace("hide", "see");
		d.style.display = "none";
	}
}

var markers = [];
window.markers = markers;
// Sets the map on all markers in the array.
function setMapOnAll(map) {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(map);
	}
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
	for (var i = 0; i < markers.length; i++) {
		markers[i].infoWindow = null;
	}
	setMapOnAll(null);
}

// Shows any markers currently in the array.
function showMarkers() {
	setMapOnAll(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
	clearMarkers();
	markers = [];
}
function centerOn(loc, store, product, price, phone, website, store_type, description) {
	deleteMarkers();
	var map = window.map;
	var geocoder = new google.maps.Geocoder();
	geocodeAddress(geocoder, map, loc, store, product, price, phone, website, store_type, description);
}

function geocodeAddress(geocoder, map, address, store, product, price, phone, website, store_type, description) {
	geocoder.geocode({
		address : address
	}, function (results, status) {
		if (status === google.maps.GeocoderStatus.OK) {
			var infoWindow = new google.maps.InfoWindow();
			map.setCenter(results[0].geometry.location);
			var marker = new google.maps.Marker({
					map : map,
					position : results[0].geometry.location
				});

			infoWindow.setPosition(results[0].geometry.location);
			var saddr = $('#search_address').val();

			infoWindow.setContent('<small><table style=\"width:250px\"><b><tr><td>' + store_type + '<br><a href=\"http://maps.google.com?saddr=' + saddr + '&daddr=' + address + '\", target=\"_blank\" onClick=\"ga(\'send\',\'event\',\'link\',\'directions_to_store\',\'' + store + ' ' + address + '\')\">' + store + '<br><font size="1">(click for directions)</font></a></b><br><a href=\"tel:' + phone + '\" onClick=\"ga(\'send\',\'event\',\'link\',\'phone_to_store\',\'' + store + ' ' + phone + '\')\">' + phone + '</a><br><a href=\"' + website + '\", target=\"_blank\">' + website + '</a></td></tr><tr><td>' + product + '<br>' + description + '<br>' + price + '</td></tr></small></table>');

			infoWindow.open(map, marker);
			google.maps.event.addListener(marker, 'click', function () {
				infoWindow.open(map, marker);
			});
			setTimeout(function () {
				infoWindow.close();
			}, 20000);
			markers.push(marker);
			SwapDivsWithClick('results_list')

		} else {
			alert('Geocode was not successful for the following reason: ' + status);
		}
	});
}
//function onLoad() {
  //  document.addEventListener("deviceready", onDeviceReady, false);
//}

//document.addEventListener('deviceready', onDeviceReady, false);
function onSuccess(position) {
  // your callback here 
  setupRotator();
  myMap.findMe();
}

function onError(error) { 
  // your callback here
}
/*
function onDeviceReady() {

	//myMap.reset();
	//myMap.findMe();
	setupRotator();
	//navigator.geolocation.getCurrentPosition(disp);
}
*/

//google.load('visualization', '1');
//<![CDATA[
$(window).resize(function () {
	var h = $(window).height(),
	offsetTop = 105; // Calculate the top offset

	$('#map_canvas').css('height', (h - offsetTop));
}).resize();

$(function () {
	var myMap = new MapsLib({
			fusionTableId : "1O6tQoCnle-2SrXQwRFUXoMQBmcRKroipZOCmDpjx",
			//"1m4Ez9xyTGfY2CU6O-UgEcPzlS0rnzLU93e4Faa0",
			googleApiKey : "AIzaSyAME1K5S2fqX8_Sjk6HsREPMCucUzeejy8",
			//"AIzaSyCFaB9oZ9ZNM9i99yUyOsaxcoBpYS_UqHo",//
			//"AIzaSyAyLaLgGUf3v6zduHNZ-4mGcg3d_Ix9rO0",//with url access
			//"AIzaSyA3FQFrNr5W2OEVmuENqhb2MBB2JabdaOY",
			locationColumn : "Location",
			map_center : [37.23571221595085, -122.02900131296383],
			//map_center:         [41.8781136, -87.66677856445312],
			locationScope : "san jose"
		});

	var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search_address'));

	$('#search').click(function () {

		textChange();
	});
	var inAddrChange = false;
	var prevAddr = '';
	function addrChange() {
		if (inAddrChange) {
			return;
		}
		if (prevAddr == $('#search_address').val()) {
			return;
		}
		inAddrChange = true;
		clearTimeout(addrChange.timeout);
		ga('send', 'event', 'link', 'address', $('#search_address').val());

		var search_address = $("#search_address").val();
		myMap.getgeoConditionInit(search_address, function () {});

		$("#text_search").val("");
		myMap.clearSearchResultsOnly();
		myMap.displayModSearchCount(0);
		//myMap.doSearch();
		inAddrChange = false;
	}
	$('#search_address').on('autocompleteselect', function () {
		addrChange();
	});
	$('#search_address').on('click change blur', function () {
		setTimeout(function () {
			addrChange();
		}, 500);
	});

	//$('#search_address').on('blur, change', function () {
	//setTimeout(function () {
	//addrChange();
	//}, 500);
	//});
	$('#search_address').on('autocompletefocus', function (event, ui) {
		$('#search_address').val(ui.item.value);

		event.preventDefault();
	});
	$("#search_address").on('keydown', function (e) {
		var key = e.keyCode ? e.keyCode : e.which;
		if (key == 13) {
			addrChange();
		}
	});
	var inTextChange = false;
	var prevText = '';
	function textChange() {
		if (inTextChange) {
			return;
		}
		if (prevText == $('#text_search').val()) {
			return;
		}
		prevText = $('#text_search').val();
		inTextChange = true;
		clearTimeout(textChange.timeout);
		//ga('send', 'event', 'link', 'search', $('#text_search').val());
		myMap.doSearch();
		$('#text_search').autocomplete('close');
		inTextChange = false;
	}

	$('#text_search').on('click change blur', function () {
		setTimeout(function () {
			textChange();
		}, 500);
	});

	//$('#text_search').textinput('create', function() {
	// textChange();
	//});

	//$('#text_search').on('blur, change', function () {
	//setTimeout(function () {
	//textChange();
	//}, 500);
	//});

	$('#text_search').on('autocompletefocus', function (event, ui) {
		$('#text_search').val(ui.item.value);

		event.preventDefault();
	});
	$('#text_search').on('autocompleteselect', function () {
		textChange();
	});
	$("#text_search").on('keydown', function (e) {
		var key = e.keyCode ? e.keyCode : e.which;
		if (key == 13) {
			textChange();
		}
		if ((key === 46) || (key == 8)) {
			var text_search = $("#text_search").val().replace("'", "\\'");
			if (text_search.length == 1) {
				myMap.clearSearchResultsOnly();
				myMap.displayModSearchCount(0);
				prevText = '';
			} else {
				return;
			}
		} else {
			return;
		}
	});

	$('#find_me').click(function () {

		myMap.findMe();
		ga('send', 'event', 'link', 'findme', $('#search_address').val());
		return false;
	});

	$('#reset').click(function () {
		myMap.reset();
		return false;
	});

	$(":text").keydown(function (e) {
		var key = e.keyCode ? e.keyCode : e.which;
		if (key === 13) {
			$('#search').click();
			return false;
		}
	});
});
//]]>
