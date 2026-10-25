// Metadata and direct-audio catalog adapter to guohuiyuan/music-lib.
package main

import (
	"encoding/json"
	"fmt"
	"github.com/guohuiyuan/music-lib/model"
	"github.com/guohuiyuan/music-lib/netease"
	"github.com/guohuiyuan/music-lib/qq"
	"os"
	"strings"
)

type Request struct {
	Action string     `json:"action"`
	Source string     `json:"source"`
	Query  string     `json:"query"`
	Limit  int        `json:"limit"`
	Song   model.Song `json:"song"`
}

func execute(r Request) (interface{}, error) {
	if strings.HasPrefix(r.Action, "catalog-") {
		return catalogRequest(r)
	}
	switch r.Source {
	case "netease":
		client := netease.New(os.Getenv("MUSIC_NETEASE_COOKIE"))
		if r.Action == "search" {
			return searchNetease(strings.TrimSpace(r.Query), r.Limit)
		}
		if r.Action == "lyrics" {
			r.Song.Source = r.Source
			text, err := client.GetLyrics(&r.Song)
			return map[string]string{"lyrics": text}, err
		}
	case "qq":
		client := qq.New(os.Getenv("MUSIC_QQ_COOKIE"))
		if r.Action == "search" {
			return client.Search(strings.TrimSpace(r.Query))
		}
		if r.Action == "lyrics" {
			r.Song.Source = r.Source
			text, err := client.GetLyrics(&r.Song)
			return map[string]string{"lyrics": text}, err
		}
	}
	return nil, fmt.Errorf("unsupported action/source")
}
func main() {
	var request Request
	if err := json.NewDecoder(os.Stdin).Decode(&request); err != nil {
		json.NewEncoder(os.Stdout).Encode(map[string]string{"error": err.Error()})
		os.Exit(1)
	}
	result, err := execute(request)
	if err != nil {
		json.NewEncoder(os.Stdout).Encode(map[string]string{"error": err.Error()})
		os.Exit(1)
	}
	json.NewEncoder(os.Stdout).Encode(result)
}
