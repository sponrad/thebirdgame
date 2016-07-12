using UnityEngine;
using System.Collections;
using UnityEngine.UI;

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

		Debug.Log (Globals.highScore.ToString ());
		Debug.Log (PlayerPrefs.GetInt ("highScore"));
		scoreText.text = "Score: " + Globals.score.ToString();
		bestScoreText.text = "Best: " + Globals.highScore.ToString ();
	}
	
	// Update is called once per frame
	void Update () {
	
	}
}
