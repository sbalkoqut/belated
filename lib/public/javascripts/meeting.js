var map = null;   
var pin = null;
var meetingId = null;
var searchManager = null;


function Init(id, latitude, longitude)
{
    meetingId = id;
    var geocoded = true;
    if ((!latitude) || (!longitude)) {
        latitude = 0.0;
        longitude = 0.0;
        geocoded = false;
    }
    Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', { callback: function() {
        map = new Microsoft.Maps.Map(document.getElementById("map"), {credentials:"Ai5WXQKnIIdyveEZ6DqBPNBJdT6kPFdk4DGABUrCBaKxHVuJ23O4YBjKKM99O8uW", theme: new Microsoft.Maps.Themes.BingTheme(), showBreadcrumb: true, disableBirdseye: true, showMapTypeSelector: false, enableSearchLogo: false, showScalebar: false }); 
        
        var location = new Microsoft.Maps.Location(latitude, longitude);
        pin = new Microsoft.Maps.Pushpin(location, {draggable: true});
        Microsoft.Maps.Events.addHandler(pin, 'mouseup', onPinMoved);
        Microsoft.Maps.Events.addHandler(map, 'dblclick', onMapDoubleClick);
        if (geocoded)
            map.entities.push(pin);
        map.setView({ center: location, zoom: geocoded ? 15 : 0  });
    }
    });
    Microsoft.Maps.loadModule('Microsoft.Maps.Search', {
        callback: function () {
            searchManager = new Microsoft.Maps.Search.SearchManager(map);
            $("#locationSearchButton").click(doSearch);
            $("#locationSearch").keydown(function (e) {
                if (e.keyCode == 13) doSearch();
            });
        }});
    $("#participantArea input:checkbox").click(function () {
        onTrackingCheckChanged(this);
    });
}

function onMapDoubleClick(e)
{
    if (map.entities.getLength() === 0)
    {
        map.entities.push(pin);
        $("#mapinstructions").html("Drag the blue push pin, or double-click on the map to adjust the coordinates of your meeting.");
    }
    e.handled = true;
    var pointClicked = new Microsoft.Maps.Point(e.getX(), e.getY());
    var newLocation = e.target.tryPixelToLocation(pointClicked);
    pin.setLocation(newLocation);
    locationChanged(newLocation);
}
function onPinMoved(e)
{
    if (e.targetType == 'pushpin'){
        var newLocation = e.target.getLocation();
        locationChanged(newLocation);
    }
}
function doSearch()
{
    var query = $("#locationSearch").val();
    if (query.length <= 0)
        return;
    var searchRequest = {
        query: query,
        count: 1,
        callback: onSearchCompleted,
        errorCallback: onSearchError
    };
    searchManager.search(searchRequest);
}
function onSearchCompleted(searchResponse)
{
    if (searchResponse.parseResults.length > 0)
    {
        var result = searchResponse.parseResults[0].location.location;
        var zoom = map.getTargetZoom();
        if (zoom === 1)
            zoom = 15;
        else if (zoom < 13)
            zoom = 13;
        map.setView({ center: result, zoom: zoom });
    }
    else
        alert("The map serach service couldn't find what you are looking for.")
}
function onSearchError()
{
    alert("The map search service is currently unavailable.");
}

function locationChanged(newLocation) {

    $.ajax({ url: "/REST/meeting/" + meetingId + "/location", type: "POST", data: { latitude: newLocation.latitude, longitude: newLocation.longitude } })
    .fail(function () { alert("Couldn't save the new meeting location: Has the meeting already started?"); });
}

function onTrackingCheckChanged(checkbox)
{
    var selectedPerson = checkbox.value;
    var track = checkbox.checked;
    $.ajax({ url: "/REST/meeting/" + meetingId + "/track", type: "POST", data: { settings: [{ email: checkbox.value, track: checkbox.checked }] } })
    .fail(function () { alert("The service is currently unavailable and couldn't save tracking changes."); });
}
