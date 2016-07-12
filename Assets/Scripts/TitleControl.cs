using UnityEngine;
using System.Collections;
using UnityEngine.UI;

public class TitleControl : MonoBehaviour {

	public Toggle soundToggle;

	// Use this for initialization
	void Start () {
		loadPlayerPrefs ();
	}
	
	// Update is called once per frame
	void Update () {
	
	}

	public void SetSound()	{
		//set the global val for later checks
		if(soundToggle.isOn) {
			Globals.sound = true;
			PlayerPrefs.SetInt ("sound", 1);
		} else {
			Globals.sound = false;
			PlayerPrefs.SetInt ("sound", 0);
		}
		PlayerPrefs.Save ();
	}

	public void loadPlayerPrefs(){
		//get it from prefs, set pref if not set
		if (!PlayerPrefs.HasKey("sound")) {
			PlayerPrefs.SetInt ("sound", 1);
			PlayerPrefs.Save ();
		}

		//prefs should be set no matter what here
		if (PlayerPrefs.GetInt("sound") == 1){
			soundToggle.isOn = true;
			Globals.sound = true;
		}
		else{
			soundToggle.isOn = false;
			Globals.sound = false;
		}
			
		if (PlayerPrefs.HasKey ("highScore")) {
			Globals.highScore = PlayerPrefs.GetInt ("highScore");
		}

		PlayerPrefs.Save ();

	}
}
