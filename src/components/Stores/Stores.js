import "./Stores.css";
import { useCallback, useEffect, useState } from "react";
import Search from "../Search/Search";
import StoreCard from "../StoreCard/StoreCard";
import { useJsApiLoader } from "@react-google-maps/api";
import MapStores from "../MapStores/MapStores";
import { config } from "../../lib/config";
import { distance } from "../../lib/helpers";
import PinMapa from "../../assets/img/icon_pin_mapa.svg";
import axios from "axios";

const InfoWindow = () => (
  <div id="infowindow-content">
    <span id="place-name" className="title"></span>
    <br />
    <span id="place-address"></span>
  </div>
);

const Stores = () => {
  const [sortedStores, setSortedStores] = useState(false);
  const [stores, setStores] = useState(null);
  const [map, setMap] = useState(null);
  const [userPlace, setUserPlace] = useState(null);

  async function fetchStores() {
    try {
      let response = await axios.get(
        "http://localhost:3001/stores"
      );

      let dataResponse = await response.data;

      setStores(dataResponse);
    } catch (err) {
      console.error("Erro na requisição:", err);
    }
  }

  useEffect(() => {
    fetchStores();
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: config.libraries,
  });

  useEffect(() => {
    if (isLoaded) {
      const input = document.getElementById("user-address");
      const options = {
        fields: ["formatted_address", "geometry", "name"],
        strictBounds: false,
      };

      const autocomplete = new window.google.maps.places.Autocomplete(
        input,
        options
      );

      autocomplete.setComponentRestrictions({
        country: ["br"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        // define coordenadas do usuario
        setSortedStores(false);
        setUserPlace(place);
      });
    }
  }, [isLoaded]);

  useEffect(() => {
    if (userPlace && map && stores) {
      if (!userPlace.geometry || !userPlace.geometry.location) {
        // User entered the name of a userPlace that was not suggested and
        // pressed the Enter key, or the userPlace Details request failed.
        window.alert(
          "No details available for input: '" + userPlace.name + "'"
        );
        return;
      }

      let bounds = new window.google.maps.LatLngBounds();
      let userPosition = new window.google.maps.LatLng(
        userPlace.geometry.location.lat(),
        userPlace.geometry.location.lng()
      );

      bounds.extend(userPosition);

      for (let i = 0; i < 3; i++) {
        if (stores[i]) {
          var storePosition = new window.google.maps.LatLng(
            stores[i].latitude,
            stores[i].longitude
          );
          bounds.extend(storePosition);
        }
      }

      map.setCenter(userPosition);
      map.fitBounds(bounds);
    }
  }, [userPlace, map, stores]);

  useEffect(() => {
    if (userPlace && stores && !sortedStores) {
      const userLocation = {
        latitude: userPlace.geometry.location.lat(),
        longitude: userPlace.geometry.location.lng(),
      };

      const nearestStores = stores.map((store) => {
        const storeLocation = {
          latitude: store.latitude,
          longitude: store.longitude,
        };

        store.distance = distance(userLocation, storeLocation);

        return store;
      });

      nearestStores.sort((a, b) => a.distance - b.distance);

      setStores(nearestStores);
      setSortedStores(true);
    }
  }, [userPlace, stores, sortedStores]);

  const onLoad = useCallback(
    function callback(map) {
      const infowindow = new window.google.maps.InfoWindow();
            const infowindowContent =
              document.getElementById("infowindow-content");
      stores &&
        stores.forEach((d) => {
          const marker = new window.google.maps.Marker({
            position: {
              lat: parseFloat(d.latitude),
              lng: parseFloat(d.longitude),
            },
            icon: PinMapa,
            map,
            title: d.name,
          });

          window.google.maps.event.addListener(marker, "click", function () {
            if(infowindowContent) {
              infowindowContent.children["place-name"].textContent = d.name;
              infowindowContent.children["place-address"].textContent = d.address;
              
              infowindow.setContent(infowindowContent);
              infowindow.open(map, marker);
            }
          });
        });

      setMap(map);
    },
    [stores]
  );

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  return (
    <>
      <h1>Lojas</h1>
      {isLoaded && (
        <Search
          id="user-address"
          map={map}
          className="search-store"
          txt="Buscar"
          placeholder="Enter a location"
        />
      )}
      {userPlace && (
        <div className="stores">
          <div className="cards-stores">
            {stores && <StoreCard store={stores} />}
          </div>
          <div className="map-store">
            {isLoaded && <MapStores onLoad={onLoad} onUnmount={onUnmount} />}
          </div>
        </div>
      )}
      <InfoWindow />
    </>
  );
};

export default Stores;
