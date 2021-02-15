using UnityEngine;
using System.Collections;
using UnityEngine.UI;
// using GooglePlayGames;
// using GooglePlayGames.BasicApi;
using UnityEngine.SocialPlatforms;

public class GameOverControl : MonoBehaviour {

	public Text scoreText;
	public Text bestScoreText;
	public Text messageText;

	// Use this for initialization
	void Start () {

		if (PlayerPrefs.HasKey ("highScore")) {
			Globals.highScore = PlayerPrefs.GetInt ("highScore");
			if (Globals.score > Globals.highScore) {
				//messageText.text = "New High Score!";
				PlayerPrefs.SetInt ("highScore", Globals.score);
				PlayerPrefs.Save ();
				Globals.highScore = Globals.score;
				Debug.Log ("score higher");
			} else {
				//messageText.text = "High score: " + prevScore;
			}
		} else {
			PlayerPrefs.SetInt ("highScore", Globals.score);
			Globals.highScore = Globals.score;
			PlayerPrefs.Save ();
		}

		Social.ReportScore(Globals.score, GPGIds.leaderboard_high_score, (bool success) => {
			// handle success or failure
		});

		Debug.Log (Globals.highScore.ToString ());
		Debug.Log (PlayerPrefs.GetInt ("highScore"));
		scoreText.text = "Score: " + Globals.score.ToString();
		bestScoreText.text = "Best: " + Globals.highScore.ToString ();
	}
	
	// Update is called once per frame
	void Update () {
	
	}

	// public void ShowLeaderboard(){
	// 	PlayGamesPlatform.Instance.ShowLeaderboardUI (GPGIds.leaderboard_high_score);
	// }
}
