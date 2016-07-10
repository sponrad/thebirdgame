using UnityEngine;
using System.Collections;

public class ChangeSceneScript : MonoBehaviour {

	public string destinationScene = "SceneSky";

	public void GoToScene(){
		Debug.Log ("GOTOSCENE");
		UnityEngine.SceneManagement.SceneManager.LoadScene (destinationScene, UnityEngine.SceneManagement.LoadSceneMode.Single);
		Time.timeScale = 1;
	}
}
