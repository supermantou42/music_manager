package main

import (
	"encoding/json"
	"fmt"
	"github.com/guohuiyuan/music-lib/model"
	"github.com/guohuiyuan/music-lib/netease"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Metadata search retains catalog entries irrespective of playback entitlement.
func searchNetease(query string, limit int) ([]model.Song, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	envelope := map[string]interface{}{"method": "POST", "url": "http://music.163.com/api/cloudsearch/pc", "params": map[string]interface{}{"s": query, "type": 1, "offset": 0, "limit": limit}}
	encoded, _ := json.Marshal(envelope)
	form := url.Values{"eparams": {netease.EncryptLinux(string(encoded))}}
	request, _ := http.NewRequest("POST", "https://music.163.com/api/linux/forward", strings.NewReader(form.Encode()))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Referer", "https://music.163.com/")
	request.Header.Set("User-Agent", "Mozilla/5.0")
	response, err := (&http.Client{Timeout: 20 * time.Second}).Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		return nil, fmt.Errorf("netease HTTP %d", response.StatusCode)
	}
	var payload struct {
		Code   int `json:"code"`
		Result struct {
			Songs []struct {
				ID   int64  `json:"id"`
				Name string `json:"name"`
				Ar   []struct {
					Name string `json:"name"`
				} `json:"ar"`
				Al struct {
					Name string `json:"name"`
					Pic  string `json:"picUrl"`
				} `json:"al"`
				Dt int `json:"dt"`
			} `json:"songs"`
		} `json:"result"`
	}
	if err = json.NewDecoder(io.LimitReader(response.Body, 4<<20)).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Code != 200 {
		return nil, fmt.Errorf("netease search code %d", payload.Code)
	}
	songs := []model.Song{}
	for _, s := range payload.Result.Songs {
		artists := []string{}
		for _, a := range s.Ar {
			artists = append(artists, a.Name)
		}
		id := strconv.FormatInt(s.ID, 10)
		songs = append(songs, model.Song{Source: "netease", ID: id, Name: s.Name, Artist: strings.Join(artists, "、"), Album: s.Al.Name, Duration: s.Dt / 1000, Cover: s.Al.Pic, Link: "https://music.163.com/#/song?id=" + id})
	}
	return songs, nil
}
