using UnityEngine;

public class Globals : MonoBehaviour 
{
	public static Globals GM;

	public static bool sound = true;

	public static int score = 0;
	public static int scoreMultiplier = 1;

	public static int highScore = 0;
	public static int sessionHighScore = 0;

	public static bool inGame = false;


	void Awake()
	{
		if(GM != null)
			GameObject.Destroy(GM);
		else
			GM = this;
		DontDestroyOnLoad(this);

	}
}